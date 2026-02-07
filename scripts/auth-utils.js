export function waitForFirebaseReady() {
  return new Promise((resolve, reject) => {
    if (window.firebaseAuth && window.firebaseDb) {
      resolve();
      return;
    }
    let settled = false;
    const finish = (ok, msg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearInterval(poller);
      window.removeEventListener("firebaseReady", onReady);
      window.removeEventListener("firebaseError", onError);
      ok ? resolve() : reject(new Error(msg));
    };
    const timeout = setTimeout(
      () => finish(false, "Firebase init timeout."),
      15000
    );
    const poller = setInterval(() => {
      if (window.firebaseAuth && window.firebaseDb) finish(true);
    }, 200);

    const onReady = () => {
      if (window.firebaseAuth && window.firebaseDb) finish(true);
    };
    const onError = (e) => {
      const msg = e?.detail?.error?.message || "Firebase init failed";
      finish(false, msg);
    };

    window.addEventListener("firebaseReady", onReady);
    window.addEventListener("firebaseError", onError);
  });
}

export async function getCurrentUserDoc(db, uid) {
  const { doc, getDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
  );
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function requireAdmin() {
  await waitForFirebaseReady();
  const { onAuthStateChanged } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
  );
  return new Promise((resolve) => {
    onAuthStateChanged(window.firebaseAuth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      const userDoc = await getCurrentUserDoc(window.firebaseDb, user.uid);
      if (!userDoc || userDoc.role !== "admin") {
        alert("You are not authorized to view this page.");
        window.location.href = "index.html";
        return;
      }
      resolve({ user, userDoc });
    });
  });
}

