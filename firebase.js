// Инициализация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA_WAUmHLsgGKd-0T0w22mjsIh_mkXuOc4",
      authDomain: "isota-ed295.firebaseapp.com",
      databaseURL: "https://isota-ed295-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "isota-ed295",
      storageBucket: "isota-ed295.firebasestorage.app",
      messagingSenderId: "658102298792",
      appId: "1:658102298792:web:fbc90679e3adadcac93a9d"
    };

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
