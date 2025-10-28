document.addEventListener("DOMContentLoaded", () => {
  const caseId = new URLSearchParams(window.location.search).get("id");
  let casePassword = null;
  let isLocked = false;

  if (!caseId) {
    alert("ID дела не найден в URL");
    window.location.href = "index.html";
    return;
  }

  firebase.firestore().collection("cases").doc(caseId).get().then(doc => {
    if (!doc.exists) {
      alert("Дело не найдено");
      return;
    }

    const data = doc.data();
    casePassword = data.password || null;
    isLocked = data.isLocked || false;

    document.getElementById("case-title").textContent = data.title || "—";

    // Статус дела
    const statusBtn = document.getElementById("status-btn");
    updateStatusButton(statusBtn, isLocked);

    statusBtn.addEventListener("click", () => {
  document.getElementById("password-modal").style.display = "flex";
  pendingAction = isLocked ? "open" : "close";
});

    // Клиент
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
    loadDocuments();
  });

  // Статус кнопки
  function updateStatusButton(btn, locked) {
    if (locked) {
      btn.textContent = "🔒 Закрыто";
      btn.className = "status-closed";
    } else {
      btn.textContent = "🔓 Открыто";
      btn.className = "status-open";
    }
  }

  // Подтверждение пароля
  function confirmAction() {
  const input = document.getElementById("confirm-password").value.trim();
  if (input !== casePassword) {
    alert("Неверный пароль");
    return;
  }

    const newStatus = pendingAction === "close";
  firebase.firestore().collection("cases").doc(caseId).update({
    isLocked: newStatus
  }).then(() => {
    isLocked = newStatus;
    updateStatusButton(document.getElementById("status-btn"), isLocked);
    closeModal();
    alert(`Дело ${newStatus ? "закрыто" : "открыто"} успешно`);
  });
}

  function closeModal() {
    document.getElementById("password-modal").style.display = "none";
    document.getElementById("confirm-password").value = "";
  }

  window.confirmAction = confirmAction;
  window.closeModal = closeModal;

  // Услуги
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
          const duration = (endH * 60 + endM) - (startH * 60 + startM);

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
        summary.innerHTML = `<p><strong>⏱ Общее затраченное время:</strong> ${totalHours} час${totalHours !== 1 ? "а" : ""} ${totalMins} мин</p>`;
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

  function requestPassword(callback) {
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

function loadDocuments() {
  const list = document.getElementById("doc-list");
  list.innerHTML = "<p>Загрузка документов...</p>";

  firebase.firestore().collection("cases").doc(caseId).collection("documents")
    .orderBy("uploadedAt", "desc")
    .get().then(snapshot => {
      list.innerHTML = "";

      if (snapshot.empty) {
        list.innerHTML = "<p>Документы не найдены.</p>";
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "case-card fade-in";
        item.innerHTML = `
          <p><strong>${data.name}</strong></p>
          <a href="${data.url}" download class="done-btn download-btn">⬇️ Скачать</a>
          <button onclick="requestPassword(() => deleteDocument('${doc.id}'))" class="done-btn delete-btn">🗑️ Удалить</button>
        `;
        list.appendChild(item);
      });
    });
}

function deleteDocument(docId) {
  const repo = "homesur/homesur.github.io"; // ← твой репозиторий
  const token = "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"; // ← твой GitHub токен

  const docRef = firebase.firestore().collection("cases").doc(caseId).collection("documents").doc(docId);
  docRef.get().then(doc => {
    if (!doc.exists) return;

    const data = doc.data();
    const fileName = encodeURIComponent(data.name);
    const path = `docs/${fileName}`;

    fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(fileData => {
      const sha = fileData.sha;

      fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Удаление файла ${data.name}`,
          sha: sha
        })
      })
      .then(() => {
        docRef.delete().then(() => {
          loadDocuments();
        });
      });
    });
  });
}

function uploadDocument() {
  const fileInput = document.getElementById("doc-upload");
  const file = fileInput.files[0];
  if (!file) {
    alert("Выберите файл");
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    const content = reader.result.split(",")[1];
    const fileName = encodeURIComponent(file.name);
    const repo = "homesur/homesur.github.io";
    const path = `docs/${fileName}`;
    const token = "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";

    fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Добавлен файл ${file.name}`,
        content: content
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.content && data.content.download_url) {
        const docData = {
          name: file.name,
          url: data.content.download_url,
          uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        firebase.firestore().collection("cases").doc(caseId).collection("documents").add(docData).then(() => {
          fileInput.value = "";
          loadDocuments();
        });
      } else {
        console.error("Ошибка загрузки:", data);
        alert("Не удалось загрузить файл. Проверь токен и репозиторий.");
      }
    })
    .catch(error => {
      console.error("Ошибка запроса к GitHub API:", error);
      alert("Ошибка при загрузке файла. Проверь подключение и токен.");
    });
  };
window.confirmAction = confirmAction;
window.closeModal = closeModal;
  reader.readAsDataURL(file);
}
window.confirmAction = confirmAction;
window.closeModal = closeModal;
});

