import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "agunity-offline-activities";

export const addToQueue = async (item) => {
  const existing = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
  existing.push(item);
  await AsyncStorage.setItem(KEY, JSON.stringify(existing));
  return existing.length;
};

export const pullQueue = async () => JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");

export const clearQueue = async () => {
  await AsyncStorage.removeItem(KEY);
};
