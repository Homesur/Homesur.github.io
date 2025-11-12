document.addEventListener("DOMContentLoaded", () => {
  const caseId = new URLSearchParams(window.location.search).get("id");
  let casePassword = null;
  let isLocked = false;
  let pendingAction = null;

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

    const statusBtn = document.getElementById("status-btn");
    updateStatusButton(statusBtn, isLocked);

    statusBtn.addEventListener("click", () => {
      document.getElementById("password-modal").style.display = "flex";
      pendingAction = isLocked ? "open" : "close";
    });

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

  function updateStatusButton(btn, locked) {
    if (locked) {
      btn.textContent = "🔒 Закрыто (нажмите для открытия)";
      btn.className = "status-closed";
    } else {
      btn.textContent = "🔓 Открыто (нажмите для закрытия)";
      btn.className = "status-open";
    }
  }

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

  function requestPassword(callback) {
    if (!casePassword) return callback();
    const entered = prompt("Введите пароль для подтверждения:");
    if (entered === casePassword) {
      callback();
    } else {
      alert("Неверный пароль");
    }
  }
window.requestPassword = requestPassword;
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

  if (!caseId) {
    console.error("caseId не определён");
    list.innerHTML = "<p>Ошибка: не указан идентификатор дела.</p>";
    return;
  }

  firebase.firestore()
    .collection("cases")
    .doc(caseId)
    .collection("documents")
    .orderBy("uploadedAt", "desc")
    .get()
    .then(snapshot => {
      list.innerHTML = "";

      if (snapshot.empty) {
        list.innerHTML = "<p>Документы не найдены.</p>";
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        console.log("Документ из Firestore:", data);

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
  if (!caseId) {
    console.error("caseId не определён");
    alert("Ошибка: не указан идентификатор дела");
    return;
  }

  const DROPBOX_TOKEN = "sl.u.AGEFEU-RPT4iy1_ZtozMAxgz9y2c-OWJSGitx1gq85f_vMymOgG63JRc-f7QrAK82NDfcZ-LaOs-wMuv7ieXF0FBXRb8POb9Vtu3_S-SXW3IQp3kVl24eFPeEmMzZDQeEEUDKZLLIsY9Ylwf_u-WemN-SagVFscBYj_pqWcaoKeLCnoPNswHBqlf9AkLgeAYfwFPmX14w0nWGGGZV3_MrEJKEPIigOGqpSgY1FTIjCAMwn4s6TLtS5KaZ7rWNbCoDlAGITcOKSZtM4MyhrOVxQpwyGzyeVxHgIq6YzEwqz1tVLL0lJvFv_Fg-vVC7hX76JqC1luPaF63Ig_exQuwvxOWk65bGmBgYzerH15cXrObg9CKXt1JxDP5pe6JY1tSv_i89AY8LvgCkiwJsICrrBwzwzGKHSQzuWIlj4NMAu5MbBF_ggYHpPXZjbBhd-HbGdHbIwpA-t156HRyuogLfb2IoId6OdUQKM0j2xgkVZpcHGVJmfz4ow0nYDBF_XzTw50z-7ViEbesDYJjkNquHhp2zY4pkuwtFVaksHKVQ68frYou0GPcs3Fvbv0IbalYe26AB5efRGIrCRYE7wsLTBA5mQCuxFtd7MZEzniRtbX3E0iLd4Wed6qw9SUjwmcJR2rs3-sfJlJker2hRx1JwhGI_hYlZRWa4XlfcZYwZBYDA4JQb0qkbTTNk2n7XzE67tQCGmSllKVrRibDZXelFeRhtT8EWY1zmnMj4LopNvdr6Sx5ARdDPKOXLqD6NtCcJOcDDXEToEOeqYyYpcAHQvXUXpaFeLBjY1CP6hkNppJB49yQ1oSmEhnX66eT9KBFksdHiJRXzC-f-Umnb1E23Md7RSdkR-L8hjplcfP-jsexwAEkPsaoKQVhRunHRnZoLTVS72x1IrCtPEg2dk26XNco0RpRGLhco20kkmZ2yG5nZqdZpTz8-dCCr5htSSUv8FFckSLjVKaK-evctJy25OAGTfUoIR_mV0f0a6-ouKXEpTweRzLkkMBbn-NUPT8duXI6TBpZBPAIhDMB5oY6tOeMdUluze3hEpgUqUfxw1T7id2Xgwwa9HSq4-gV0-Rw6b3MPZ2F_NdAJdyx6L0CtYKrZg25teKToA6MlzHEX9KMzuVYhTH_VJrhJ4RaB_gh5i8j3BhF-FGUOkOr3y18axy1s00sOndPNtYshzuFgD5_o2ivcMhC2Pi6F6paatgD_QcXZIGRGQQy82UdAGoBRzfA_zUh19O0jagtv4-QjYB8vYO91KxTfTPXoSoNcj-n8jE"; // 🔐 вставь свой токен

  // Получаем документ из Firestore
  firebase.firestore()
    .collection("cases")
    .doc(caseId)
    .collection("documents")
    .doc(docId)
    .get()
    .then(doc => {
      if (!doc.exists) throw new Error("Документ не найден");

      const data = doc.data();
      const dropboxPath = data.path;
      if (!dropboxPath) throw new Error("Путь Dropbox не сохранён");

      // Удаляем файл из Dropbox
      return fetch("https://api.dropboxapi.com/2/files/delete_v2", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ path: dropboxPath })
      })
      .then(async res => {
        const text = await res.text();
        if (!res.ok) {
          console.error("Ошибка Dropbox:", text);
          throw new Error("Ошибка при удалении файла из Dropbox");
        }
        console.log("Файл удалён из Dropbox:", dropboxPath);

        // Удаляем запись из Firestore
        return firebase.firestore()
          .collection("cases")
          .doc(caseId)
          .collection("documents")
          .doc(docId)
          .delete();
      });
    })
    .then(() => {
      console.log("Запись удалена из Firestore:", docId);
      loadDocuments(); // 🔄 обновляем карточки
    })
    .catch(error => {
      console.error("Ошибка при удалении документа:", error);
      alert("Ошибка при удалении документа");
        });
 }

function uploadDocument() {
  const fileInput = document.getElementById("doc-upload");
  const file = fileInput.files[0];
  if (!file) {
    alert("Выберите файл");
    return;
  }

  if (!caseId) {
    console.error("caseId не определён");
    alert("Ошибка: не указан идентификатор дела");
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    const content = reader.result.split(",")[1];
    const DROPBOX_TOKEN = "sl.u.AGEFEU-RPT4iy1_ZtozMAxgz9y2c-OWJSGitx1gq85f_vMymOgG63JRc-f7QrAK82NDfcZ-LaOs-wMuv7ieXF0FBXRb8POb9Vtu3_S-SXW3IQp3kVl24eFPeEmMzZDQeEEUDKZLLIsY9Ylwf_u-WemN-SagVFscBYj_pqWcaoKeLCnoPNswHBqlf9AkLgeAYfwFPmX14w0nWGGGZV3_MrEJKEPIigOGqpSgY1FTIjCAMwn4s6TLtS5KaZ7rWNbCoDlAGITcOKSZtM4MyhrOVxQpwyGzyeVxHgIq6YzEwqz1tVLL0lJvFv_Fg-vVC7hX76JqC1luPaF63Ig_exQuwvxOWk65bGmBgYzerH15cXrObg9CKXt1JxDP5pe6JY1tSv_i89AY8LvgCkiwJsICrrBwzwzGKHSQzuWIlj4NMAu5MbBF_ggYHpPXZjbBhd-HbGdHbIwpA-t156HRyuogLfb2IoId6OdUQKM0j2xgkVZpcHGVJmfz4ow0nYDBF_XzTw50z-7ViEbesDYJjkNquHhp2zY4pkuwtFVaksHKVQ68frYou0GPcs3Fvbv0IbalYe26AB5efRGIrCRYE7wsLTBA5mQCuxFtd7MZEzniRtbX3E0iLd4Wed6qw9SUjwmcJR2rs3-sfJlJker2hRx1JwhGI_hYlZRWa4XlfcZYwZBYDA4JQb0qkbTTNk2n7XzE67tQCGmSllKVrRibDZXelFeRhtT8EWY1zmnMj4LopNvdr6Sx5ARdDPKOXLqD6NtCcJOcDDXEToEOeqYyYpcAHQvXUXpaFeLBjY1CP6hkNppJB49yQ1oSmEhnX66eT9KBFksdHiJRXzC-f-Umnb1E23Md7RSdkR-L8hjplcfP-jsexwAEkPsaoKQVhRunHRnZoLTVS72x1IrCtPEg2dk26XNco0RpRGLhco20kkmZ2yG5nZqdZpTz8-dCCr5htSSUv8FFckSLjVKaK-evctJy25OAGTfUoIR_mV0f0a6-ouKXEpTweRzLkkMBbn-NUPT8duXI6TBpZBPAIhDMB5oY6tOeMdUluze3hEpgUqUfxw1T7id2Xgwwa9HSq4-gV0-Rw6b3MPZ2F_NdAJdyx6L0CtYKrZg25teKToA6MlzHEX9KMzuVYhTH_VJrhJ4RaB_gh5i8j3BhF-FGUOkOr3y18axy1s00sOndPNtYshzuFgD5_o2ivcMhC2Pi6F6paatgD_QcXZIGRGQQy82UdAGoBRzfA_zUh19O0jagtv4-QjYB8vYO91KxTfTPXoSoNcj-n8jE"; // 🔐 вставь свой токен
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const dropboxPath = `/advocall/${safeName}`;

    // 📤 Загрузка файла
    fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DROPBOX_TOKEN}`,
        "Dropbox-API-Arg": `{"path": "${dropboxPath}", "mode": "add", "autorename": true}`,
        "Content-Type": "application/octet-stream"
      },
      body: atob(content)
    })
    .then(() => {
      // 🔗 Получение ссылки
      return fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ path: dropboxPath })
      });
    })
    .then(res => res.json())
    .then(linkData => {
      const rawUrl = linkData.url.replace("?dl=0", "?raw=1");
      console.log("Ссылка Dropbox:", rawUrl);

      const docData = {
        name: file.name,
        url: rawUrl,
        path: dropboxPath, // ✅ сохраняем путь для удаления
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      console.log("Сохраняем в Firestore:", docData);

      return firebase.firestore()
        .collection("cases")
        .doc(caseId)
        .collection("documents")
        .add(docData);
    })
    .then(() => {
      fileInput.value = "";
      loadDocuments(); // ✅ обновляем карточки
    })
    .catch(error => {
      console.error("Ошибка загрузки:", error);
      alert("Ошибка при загрузке файла");
    });
  };
window.confirmAction = confirmAction;
window.closeModal = closeModal;
window.deleteService = deleteService;
  reader.readAsDataURL(file);
}
window.confirmAction = confirmAction;
window.closeModal = closeModal;
window.deleteService = deleteService;
window.editService = editService;
window.toggleDone = toggleDone;
window.addService = addService;
window.uploadDocument = uploadDocument;
window.deleteDocument = deleteDocument;
});
