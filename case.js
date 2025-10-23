const caseId = new URLSearchParams(window.location.search).get("id");
let pendingAction = null;
let casePassword = null;

if (!caseId) {
  alert("ID дела не найден в URL");
  window.location.href = "index.html";
}

firebase.firestore().collection("cases").doc(caseId).get().then(doc => {
  if (!doc.exists) {
    alert("Дело не найдено");
    return;
  }

  const data = doc.data();
  casePassword = data.password || null;
  document.getElementById("case-title").textContent = data.title || "—";

  // Загрузка клиента
  const clientId = data.clientId;
  if (!clientId) {
    document.getElementById("client-name").textContent = "Клиент не указан";
    return;
  }

  firebase.firestore().collection("clients").doc(clientId).get().then(clientDoc => {
    if (!clientDoc.exists) {
      document.getElementById("client-name").textContent = "Клиент не найден";
      return;
    }

    const client = clientDoc.data();
    document.getElementById("client-name").textContent = `${client.firstname} ${client.lastname}`;
    document.getElementById("client-phone").textContent = client.phone || "—";
	document.getElementById("client-idnp").textContent = client.idnp || "—";
    document.getElementById("client-address").textContent = client.address || "—";
  });

  loadServices();
});

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
    isDone: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  firebase.firestore().collection("cases").doc(caseId).collection("services").add(serviceData).then(() => {
    clearForm();
    loadServices();
  });
}

function clearForm() {
  document.getElementById("service-date").value = "";
  document.getElementById("start-time").value = "";
  document.getElementById("end-time").value = "";
  document.getElementById("service-description").value = "";

  const saveBtn = document.querySelector(".save-btn");
  saveBtn.textContent = "➕ Добавить в заметки";
  saveBtn.onclick = addService;
}

function loadServices() {
  const list = document.getElementById("service-list");
  list.innerHTML = "<p>Загрузка...</p>";
  let totalMinutes = 0;

  firebase.firestore().collection("cases").doc(caseId).collection("services")
    .orderBy("createdAt", "asc")
    .get().then(snapshot => {
      list.innerHTML = "";

      if (snapshot.empty) {
        list.innerHTML = "<p>Заметок пока нет.</p>";
        return;
      }

      const active = [];
      const done = [];

      snapshot.forEach(doc => {
        const s = doc.data();
        const [startH, startM] = s.start.split(":").map(Number);
        const [endH, endM] = s.end.split(":").map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        const duration = endTotal - startTotal;

        if (s.isDone) totalMinutes += duration;

        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const durationText = `${hours ? hours + " час" : ""}${minutes ? " " + minutes + " мин" : ""}`.trim() || "менее минуты";

        const item = document.createElement("div");
        item.className = `case-card fade-in ${s.isDone ? "done" : ""}`;
        item.innerHTML = `
  <p><strong>${s.date}</strong> начало в ${s.start} окончание в ${s.end} затрачено времени ${durationText}</p>
  <p>${s.description}</p>
  <div class="button-group">
    <button onclick="requestPassword(() => toggleDone('${doc.id}', ${s.isDone}))" class="done-btn ${s.isDone ? 'done' : 'not-done'}">
      ${s.isDone ? '✅ Выполнено' : '🔴 Выполнить!'}
    </button>
    <button onclick="requestPassword(() => editService('${doc.id}', '${s.date}', '${s.start}', '${s.end}', \`${s.description.replace(/`/g, "\\`")}\`))" class="done-btn edit-btn">✏️ Редактировать</button>
    <button onclick="requestPassword(() => deleteService('${doc.id}'))" class="done-btn delete-btn">🗑️ Удалить</button>
  </div>
        `;

        if (s.isDone) {
          done.push(item);
        } else {
          active.push(item);
        }
      });

      active.forEach(el => list.appendChild(el));

      if (done.length > 0) {
        const divider = document.createElement("div");
        divider.className = "section-divider";
        divider.textContent = "✅ Выполненные";
        list.appendChild(divider);
      }

      done.forEach(el => list.appendChild(el));

      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = totalMinutes % 60;
      const summary = document.createElement("div");
      summary.className = "case-card fade-in";
      summary.innerHTML = `<p><strong>⏱ Общее затраченное время (выполненные):</strong> ${totalHours} час${totalHours !== 1 ? "а" : ""} ${totalMins} мин</p>`;
      list.appendChild(summary);
    });
}

function toggleDone(id, currentStatus) {
  firebase.firestore().collection("cases").doc(caseId).collection("services").doc(id).update({
    isDone: !currentStatus
  }).then(() => {
    loadServices();
  });
}

function deleteService(id) {
  firebase.firestore().collection("cases").doc(caseId).collection("services").doc(id).delete().then(() => {
    loadServices();
  });
}

// Заглушки для requestPassword и editService — если ещё не реализованы
function requestPassword(callback) {
  // Здесь можно вставить модальное окно для ввода пароля
  if (!casePassword) return callback();
  const entered = prompt("Введите пароль для подтверждения:");
  if (entered === casePassword) {
    callback();
  } else {
    alert("Неверный пароль");
  }
}

function editService(id, date, start, end, description) {
  document.getElementById("service-date").value = date;
  document.getElementById("start-time").value = start;
  document.getElementById("end-time").value = end;
  document.getElementById("service-description").value = description;

  const saveBtn = document.querySelector(".save-btn");
  saveBtn.textContent = "💾 Сохранить изменения";
  saveBtn.onclick = function () {
    const updated = {
      date: document.getElementById("service-date").value,
      start: document.getElementById("start-time").value,
      end: document.getElementById("end-time").value,
      description: document.getElementById("service-description").value.trim()
    };

    firebase.firestore().collection("cases").doc(caseId).collection("services").doc(id).update(updated).then(() => {
      clearForm();
      loadServices();
    });
  };
}
