const caseId = new URLSearchParams(window.location.search).get("id");

if (!caseId) {
  alert("ID дела не найден в URL");
  window.location.href = "index.html";
}

// Загрузка данных дела
firebase.firestore().collection("cases").doc(caseId).get().then(doc => {
  if (!doc.exists) {
    alert("Дело не найдено");
    return;
  }

  const data = doc.data();
  document.getElementById("case-title").textContent = data.title || "—";
  document.getElementById("client-name").textContent = `${data.firstname || ""} ${data.lastname || ""}`;
  loadServices();
});

// Добавление новой услуги
function addService() {
  const date = document.getElementById("service-date").value;
  const start = document.getElementById("start-time").value;
  const end = document.getElementById("end-time").value;
  const description = document.getElementById("service-description").value.trim();

  if (!date || !start || !end || !description) {
    alert("Пожалуйста, заполните все поля");
    return;
  }

  const serviceData = {
    date,
    start,
    end,
    description,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  firebase.firestore().collection("cases").doc(caseId).collection("services").add(serviceData).then(() => {
    clearForm();
    loadServices();
  });
}

// Очистка формы
function clearForm() {
  document.getElementById("service-date").value = "";
  document.getElementById("start-time").value = "";
  document.getElementById("end-time").value = "";
  document.getElementById("service-description").value = "";

  const saveBtn = document.querySelector(".save-btn");
  saveBtn.textContent = "✅ Выполнено";
  saveBtn.onclick = addService;
}

// Загрузка и отображение услуг
function loadServices() {
  const list = document.getElementById("service-list");
  list.innerHTML = "<p>Загрузка...</p>";
  let totalMinutes = 0;

  firebase.firestore().collection("cases").doc(caseId).collection("services")
    .orderBy("createdAt", "desc")
    .get().then(snapshot => {
      list.innerHTML = "";

      if (snapshot.empty) {
        list.innerHTML = "<p>Услуги пока не добавлены.</p>";
        return;
      }

      snapshot.forEach(doc => {
        const s = doc.data();

        const [startH, startM] = s.start.split(":").map(Number);
        const [endH, endM] = s.end.split(":").map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        const duration = endTotal - startTotal;
        totalMinutes += duration;

        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const durationText = `${hours ? hours + " час" : ""}${minutes ? " " + minutes + " мин" : ""}`.trim() || "менее минуты";

        const item = document.createElement("div");
        item.className = "case-card fade-in";
        item.innerHTML = `
          <p><strong>${s.date}</strong> начало ${s.start} окончание ${s.end} затрачено времени ${durationText}</p>
          <p>${s.description}</p>
          <button onclick="editService('${doc.id}', '${s.date}', '${s.start}', '${s.end}', \`${s.description.replace(/`/g, "\\`")}\`)">✏️ Редактировать</button>
          <button onclick="deleteService('${doc.id}')">🗑️ Удалить</button>
        `;
        list.appendChild(item);
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = totalMinutes % 60;
      const summary = document.createElement("div");
      summary.className = "case-card fade-in";
      summary.innerHTML = `<p><strong>⏱ Общее затраченное время:</strong> ${totalHours} час${totalHours !== 1 ? "а" : ""} ${totalMins} мин</p>`;
      list.appendChild(summary);
    });
}

// Удаление услуги
function deleteService(serviceId) {
  if (!confirm("Удалить услугу?")) return;

  firebase.firestore().collection("cases").doc(caseId).collection("services").doc(serviceId).delete().then(() => {
    loadServices();
  });
}

// Редактирование услуги
function editService(id, date, start, end, description) {
  document.getElementById("service-date").value = date;
  document.getElementById("start-time").value = start;
  document.getElementById("end-time").value = end;
  document.getElementById("service-description").value = description;

  const saveBtn = document.querySelector(".save-btn");
  saveBtn.textContent = "💾 Сохранить изменения";
  saveBtn.onclick = function () {
    const newDate = document.getElementById("service-date").value;
    const newStart = document.getElementById("start-time").value;
    const newEnd = document.getElementById("end-time").value;
    const newDesc = document.getElementById("service-description").value.trim();

    if (!newDate || !newStart || !newEnd || !newDesc) {
      alert("Заполните все поля");
      return;
    }

    firebase.firestore().collection("cases").doc(caseId).collection("services").doc(id).update({
      date: newDate,
      start: newStart,
      end: newEnd,
      description: newDesc
    }).then(() => {
      clearForm();
      loadServices();
    });
  };
}

// Экспорт услуг в Excel (.xlsx)
function exportToExcel() {
  firebase.firestore().collection("cases").doc(caseId).collection("services")
    .orderBy("createdAt", "asc")
    .get().then(snapshot => {
      if (snapshot.empty) {
        alert("Нет данных для экспорта.");
        return;
      }

      const rows = [["Дата", "Начало", "Окончание", "Описание", "Затрачено"]];
      let totalMinutes = 0;

      snapshot.forEach(doc => {
        const s = doc.data();
        const [startH, startM] = s.start.split(":").map(Number);
        const [endH, endM] = s.end.split(":").map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        const duration = endTotal - startTotal;
        totalMinutes += duration;

        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const durationText = `${hours ? hours + " час" : ""}${minutes ? " " + minutes + " мин" : ""}`.trim() || "менее минуты";

        rows.push([
          s.date,
          s.start,
          s.end,
          s.description,
          durationText
        ]);
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = totalMinutes % 60;
      const summaryText = `${totalHours} час${totalHours !== 1 ? "а" : ""} ${totalMins} мин`;

      rows.push(["", "", "", "⏱ Общее время", summaryText]);

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Услуги");

      XLSX.writeFile(workbook, `Услуги_${caseId}.xlsx`);
    });
}
