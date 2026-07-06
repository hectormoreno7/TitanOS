import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export const DEFAULT_TENANT_ID = "titan-bike-works";

export function tenantDoc(tenantId = DEFAULT_TENANT_ID) {
  return doc(db, "tenants", tenantId);
}

export function tenantCollection(collectionName, tenantId = DEFAULT_TENANT_ID) {
  return collection(db, "tenants", tenantId, collectionName);
}

export async function getTenantConfig(tenantId = DEFAULT_TENANT_ID) {
  const ref = doc(db, "tenants", tenantId, "config", "main");
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export async function saveTenantConfig(config, tenantId = DEFAULT_TENANT_ID) {
  const ref = doc(db, "tenants", tenantId, "config", "main");

  await setDoc(
    ref,
    {
      ...config,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getTenantItems(
  collectionName,
  tenantId = DEFAULT_TENANT_ID
) {
  const snap = await getDocs(tenantCollection(collectionName, tenantId));

  return snap.docs.map((docItem) => ({
    firebaseId: docItem.id,
    ...docItem.data(),
  }));
}

export async function addTenantItem(
  collectionName,
  data,
  tenantId = DEFAULT_TENANT_ID
) {
  return addDoc(tenantCollection(collectionName, tenantId), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateTenantItem(
  collectionName,
  firebaseId,
  data,
  tenantId = DEFAULT_TENANT_ID
) {
  const ref = doc(db, "tenants", tenantId, collectionName, firebaseId);

  return updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTenantItem(
  collectionName,
  firebaseId,
  tenantId = DEFAULT_TENANT_ID
) {
  const ref = doc(db, "tenants", tenantId, collectionName, firebaseId);
  return deleteDoc(ref);
}

export async function upsertTenantItem(
  collectionName,
  data,
  tenantId = DEFAULT_TENANT_ID
) {
  if (data.firebaseId) {
    await updateTenantItem(collectionName, data.firebaseId, data, tenantId);
    return data;
  }

  const ref = await addTenantItem(collectionName, data, tenantId);

  return {
    ...data,
    firebaseId: ref.id,
  };
}