// Firestore-backed product service
export async function getAllProducts(db) {
  const { collection, getDocs, orderBy, query } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
  );
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addProduct(db, data) {
  const { collection, addDoc, serverTimestamp } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
  );
  return addDoc(collection(db, "products"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(db, id, data) {
  const { doc, updateDoc, serverTimestamp } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
  );
  return updateDoc(doc(db, "products", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(db, id) {
  const { doc, deleteDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
  );
  return deleteDoc(doc(db, "products", id));
}

