// Показывает форму добавления нового дела
function showAddCaseForm() {
  document.getElementById("add-case-form").style.display = "block";
  document.getElementById("select-case-form").style.display = "none";

  document.querySelector(".add-btn").classList.add("active");
  document.querySelector(".select-btn").classList.remove("active");

  firebase.firestore().collection("cases").get().then(snapshot => {
    const count = snapshot.size + 1;
    const title = "Dosar №" + String(count).padStart(5, '0');
    document.getElementById("new-title").value = title;
  });
}

// Показывает форму выбора дела
function showSelectForm() {
  document.getElementById("select-case-form").style.display = "block";
  document.getElementById("add-case-form").style.display = "none";

  document.querySelector(".select-btn").classList.add("active");
  document.querySelector(".add-btn").classList.remove("active");
}

// Добавляет новое дело
function addNewCase() {
  const title = document.getElementById("new-title").value;
  const firstname = document.getElementById("new-firstname").value.trim();
  const lastname = document.getElementById("new-lastname").value.trim();
  const password = document.getElementById("new-password").value.trim();
  const isLocked = document.getElementById("new-isLocked").checked;

  if (!firstname || !lastname || !password) {
    alert("Пожалуйста, заполните все поля.");
    return;
  }

  const client = `${lastname} ${firstname}`;

  firebase.firestore().collection("cases").add({
    title,
    firstname,
    lastname,
    client,
    password,
    isLocked,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(docRef => {
    alert(`Дело ${title} добавлено!`);
    window.location.href = `case.html?id=${docRef.id}`;
  }).catch(error => {
    console.error("Ошибка при добавлении:", error);
    alert("Ошибка при добавлении дела.");
  });
}

// Поиск дел по имени и/или фамилии клиента
function searchCaseByClient() {
  const firstname = document.getElementById("search-firstname").value.trim().toLowerCase();
  const lastname = document.getElementById("search-lastname").value.trim().toLowerCase();
  const resultBox = document.getElementById("search-result");

  if (!firstname && !lastname) {
    resultBox.innerHTML = "<p class='fade-in'>Введите хотя бы имя или фамилию.</p>";
    return;
  }

  resultBox.innerHTML = "<p class='fade-in'>Поиск дела...</p>";

  firebase.firestore().collection("cases").get().then(snapshot => {
    let resultsHTML = "";
    let matchCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const client = data.client.toLowerCase();

      const matchFirst = firstname ? client.includes(firstname) : true;
      const matchLast = lastname ? client.includes(lastname) : true;

      if (matchFirst && matchLast) {
        matchCount++;
        resultsHTML += `
          <div class="case-card fade-in">
            <h3>${data.title}</h3>
            <p>Клиент: ${data.client}</p>
            <input type="password" id="access-password-${doc.id}" placeholder="Введите пароль" />
            <button onclick="accessCase('${doc.id}', '${data.password}')">Войти</button>
          </div>
        `;
      }
    });

    resultBox.innerHTML = matchCount > 0
      ? resultsHTML
      : "<p class='fade-in'>Дела не найдены.</p>";
  });
}

// Проверка пароля и переход к карточке дела
function accessCase(caseId, realPassword) {
  const inputPassword = document.getElementById(`access-password-${caseId}`).value;
  if (inputPassword === realPassword) {
    window.location.href = `case.html?id=${caseId}`;
  } else {
    alert("Неверный пароль!");
  }
}
