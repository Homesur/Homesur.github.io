function showAddClientForm() {
  document.getElementById("add-client-form").style.display = "block";
  document.getElementById("add-case-form").style.display = "none";
  document.getElementById("select-case-form").style.display = "none";
}

function showAddCaseForm() {
  document.getElementById("add-client-form").style.display = "none";
  document.getElementById("add-case-form").style.display = "block";
  document.getElementById("select-case-form").style.display = "none";
  loadClientOptions();
  generateCaseTitle();
}

function showSelectForm() {
  document.getElementById("add-client-form").style.display = "none";
  document.getElementById("add-case-form").style.display = "none";
  document.getElementById("select-case-form").style.display = "block";
}

function addNewClient() {
  const firstname = document.getElementById("client-firstname").value.trim();
  const lastname = document.getElementById("client-lastname").value.trim();
  const idnp = document.getElementById("client-idnp").value.trim();
  const phone = document.getElementById("client-phone").value.trim();
  const address = document.getElementById("client-address").value.trim();

  if (!firstname || !lastname || !idnp || !phone || !address) {
    alert("Пожалуйста, заполните все поля");
    return;
  }

  const clientData = {
    firstname,
    lastname,
    idnp,
    phone,
    address,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  firebase.firestore().collection("clients").add(clientData).then(() => {
    alert("Клиент успешно добавлен");
    document.getElementById("add-client-form").reset();
    document.getElementById("add-client-form").style.display = "none";
  });
}

function loadClientOptions() {
  const select = document.getElementById("client-select");
  select.innerHTML = "<option value=''>Выберите клиента</option>";

  firebase.firestore().collection("clients").orderBy("createdAt", "desc").get().then(snapshot => {
    snapshot.forEach(doc => {
      const c = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = `${c.firstname} ${c.lastname} (${c.phone})`;
      select.appendChild(option);
    });
  });
}

function generateCaseTitle() {
  firebase.firestore().collection("cases").get().then(snapshot => {
    const count = snapshot.size + 1;
    const title = "Dosar nr. " + String(count).padStart(4, "0");
    document.getElementById("new-title").value = title;
  });
}

function addNewCase() {
  const clientId = document.getElementById("client-select").value;
  const password = document.getElementById("new-password").value.trim();
  const isLocked = document.getElementById("new-isLocked").checked;
  const title = document.getElementById("new-title").value;

  if (!clientId || !password || !title) {
    alert("Выберите клиента и введите пароль");
    return;
  }

  const caseData = {
    title,
    password,
    isLocked,
    clientId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  firebase.firestore().collection("cases").add(caseData).then(() => {
    alert("Дело успешно создано: " + title);
    document.getElementById("add-case-form").reset();
    document.getElementById("add-case-form").style.display = "none";
  });
}

function searchCaseByClient() {
  const firstname = document.getElementById("search-firstname").value.trim().toLowerCase();
  const lastname = document.getElementById("search-lastname").value.trim().toLowerCase();
  const result = document.getElementById("search-result");
  result.innerHTML = "Поиск...";

  firebase.firestore().collection("clients").get().then(snapshot => {
    const matches = [];
    snapshot.forEach(doc => {
      const c = doc.data();
      const matchFirst = firstname ? c.firstname.toLowerCase().includes(firstname) : true;
      const matchLast = lastname ? c.lastname.toLowerCase().includes(lastname) : true;

      if (matchFirst && matchLast) {
        matches.push({ id: doc.id, name: `${c.firstname} ${c.lastname}` });
      }
    });

    if (matches.length === 0) {
      result.innerHTML = "Клиент не найден.";
      return;
    }

    const clientIds = matches.map(c => c.id);

    firebase.firestore().collection("cases")
      .where("clientId", "in", clientIds)
      .get().then(caseSnap => {
        if (caseSnap.empty) {
          result.innerHTML = "Дела не найдены.";
          return;
        }

        result.innerHTML = "";
        caseSnap.forEach(doc => {
          const data = doc.data();
          const client = matches.find(c => c.id === data.clientId);
          const link = document.createElement("a");
          link.href = `case.html?id=${doc.id}`;
          link.textContent = `${data.title} (${client.name})`;
          link.style.display = "block";
          link.style.marginBottom = "8px";
          result.appendChild(link);
        });
      });
  });
}
