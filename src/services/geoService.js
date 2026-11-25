const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-yN9hu266boJpX1CqgxSYeTaMubpXXws",
  authDomain: "zimbabweland-67218.firebaseapp.com",
  projectId: "zimbabweland-67218",
  storageBucket: "zimbabweland-67218.appspot.com",
  messagingSenderId: "397476483398",
  appId: "1:397476483398:web:21e145f45945134c511547",
};

let _fs = null;
const cache = {};

async function getFS() {
  if (_fs) return _fs;
  const { initializeApp, getApps } = await import(
    /* @vite-ignore */ "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
  );
  const { getFirestore, collection, getDocs } = await import(
    /* @vite-ignore */ "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
  );
  const app =
    getApps().find((a) => a.name === "kraalmarket-geo") ||
    initializeApp(FIREBASE_CONFIG, "kraalmarket-geo");
  _fs = { db: getFirestore(app), collection, getDocs };
  return _fs;
}

async function fetchCollection(path) {
  if (cache[path]) return cache[path];
  const { db, collection, getDocs } = await getFS();
  const snap = await getDocs(collection(db, path));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  cache[path] = data;
  return data;
}

export const fetchProvinces = () => fetchCollection("provinces");
export const fetchDistricts = (provinceId) =>
  fetchCollection(`provinces/${provinceId}/districts`);
export const fetchTowns = (provinceId) =>
  fetchCollection(`provinces/${provinceId}/towns`);
