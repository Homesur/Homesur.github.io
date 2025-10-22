// Firebase инициализация (в firebase.js)
const db = firebase.firestore();

function showAddCaseForm() {
  document.getElementById("add-case-form").style.display = "block";
  document.getElementById("select-case-form").style.display = "none";
}

function showSelectForm() {
  document.getElementById("select-case-form").style.display = "block";
  document.getElementById("add-case-form").style.display = "none";
}

function addNewCase() {
  const client = document.getElementById("new-client").value.trim();
  const password = document.getElementById("new-password").value.trim();
  const isLocked = document.getElementById("new-isLocked").checked;

  if (!client || !password) {
    alert("Пожалуйста, заполните все поля.");
    return;
  }

  db.collection("cases").get().then(snapshot => {
    const count = snapshot.size + 1;
    const title = "Dosar" + String(count).padStart(5, '0');

    db.collection("cases").add({
      title,
      client,
      password,
      isLocked,
      steps: []
    }).then(() => {
      alert(`Дело ${title} добавлено!`);
      document.getElementById("add-case-form").style.display = "none";
      location.reload();
    }).catch(error => {
      console.error("Ошибка при добавлении:", error);
      alert("Ошибка при добавлении дела.");
    });
  });
}

function searchCaseByClient() {
  const firstname = document.getElementById("search-firstname").value.trim().toLowerCase();
  const lastname = document.getElementById("search-lastname").value.trim().toLowerCase();

  if (!firstname || !lastname) {
    alert("Введите имя и фамилию клиента.");
    return;
  }

  db.collection("cases").get().then(snapshot => {
    let found = null;

    snapshot.forEach(doc => {
      const data = doc.data();
      const client = data.client.toLowerCase();

      if (client.includes(firstname) && client.includes(lastname)) {
        found = { id: doc.id, data };
      }
    });

    if (!found) {
      document.getElementById("search-result").innerHTML = "Дело не найдено.";
      return;
    }

    const { id, data } = found;
    document.getElementById("search-result").innerHTML = `
      <div class="case-card">
        <h3>${data.title}</h3>
        <p>Клиент: ${data.client}</p>
        <input type="password" id="access-password" placeholder="Введите пароль" />
        <button onclick="accessCase('${id}', '${data.password}')">Войти</button>
      </div>
    `;
  });
}

function accessCase(caseId, realPassword) {
  const inputPassword = document.getElementById("access-password").value;
  if (inputPassword === realPassword) {
    localStorage.setItem("selectedCaseId", caseId);
    window.location.href = "case.html";
  } else {
    alert("Неверный пароль!");
  }
}
