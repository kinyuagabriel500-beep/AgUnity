import { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import StatusPill from "./src/components/StatusPill";
import { login, sendActivity, setAuthToken } from "./src/services/api";
import { addToQueue, clearQueue, pullQueue } from "./src/storage/offlineQueue";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
});

export default function App() {
  const [online, setOnline] = useState(false);
  const [queued, setQueued] = useState(0);
  const [session, setSession] = useState({ token: "", email: "", password: "" });
  const [activity, setActivity] = useState({ type: "planting", notes: "", farmId: "", date: "2026-04-13", costKes: "0" });

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    (async () => {
      const saved = await AsyncStorage.getItem("agunity-mobile-token");
      if (saved) {
        setAuthToken(saved);
        setSession((p) => ({ ...p, token: saved }));
      }
    })();
  }, []);
  const signIn = async () => {
    try {
      const auth = await login({ email: session.email, password: session.password });
      setAuthToken(auth.token);
      await AsyncStorage.setItem("agunity-mobile-token", auth.token);
      setSession((p) => ({ ...p, token: auth.token }));
      setOnline(true);
      Alert.alert("Signed In", "Token saved for API sync.");
    } catch (_e) {
      setOnline(false);
      Alert.alert("Login Failed", "Check mobile credentials.");
    }
  };


  const notify = async (message) => {
    await Notifications.scheduleNotificationAsync({
      content: { title: "AGUNITY Update", body: message },
      trigger: null
    });
  };

  const queueActivity = async () => {
    const size = await addToQueue({ ...activity, queuedAt: new Date().toISOString() });
    setQueued(size);
    await notify("Activity saved offline. Sync when online.");
    Alert.alert("Saved Offline", "Activity queued successfully.");
  };

  const syncQueue = async () => {
    try {
      const items = await pullQueue();
      for (const item of items) await sendActivity(item);
      await clearQueue();
      setQueued(0);
      setOnline(true);
      await notify("Offline records synced successfully.");
    } catch (_e) {
      setOnline(false);
      Alert.alert("Sync Failed", "Still offline or server unavailable.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={styles.title}>AGUNITY Mobile</Text><StatusPill online={online} /></View>
        <Text style={styles.subtitle}>Icon-first activity logging for low bandwidth.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={session.email} onChangeText={(v) => setSession((p) => ({ ...p, email: v }))} />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} secureTextEntry value={session.password} onChangeText={(v) => setSession((p) => ({ ...p, password: v }))} />
          <Pressable style={styles.button} onPress={signIn}><Text style={styles.buttonText}>🔐 Sign In</Text></Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Farm ID</Text>
          <TextInput style={styles.input} value={activity.farmId} onChangeText={(v) => setActivity((p) => ({ ...p, farmId: v }))} />
          <Text style={styles.label}>Activity Type</Text>
          <TextInput style={styles.input} value={activity.type} onChangeText={(v) => setActivity((p) => ({ ...p, type: v }))} />
          <Text style={styles.label}>Notes</Text>
          <TextInput style={styles.input} value={activity.notes} onChangeText={(v) => setActivity((p) => ({ ...p, notes: v }))} />
        </View>

        <View style={styles.row}>
          <Pressable style={styles.button} onPress={queueActivity}><Text style={styles.buttonText}>💾 Save Offline</Text></Pressable>
          <Pressable style={styles.button} onPress={syncQueue}><Text style={styles.buttonText}>☁️ Sync Now</Text></Pressable>
        </View>

        <Text style={styles.queueText}>Queued activities: {queued}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f8f4" },
  content: { padding: 16, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#184d2f" },
  subtitle: { color: "#345" },
  card: { backgroundColor: "white", borderRadius: 10, padding: 12, gap: 6 },
  label: { fontSize: 12, color: "#444" },
  input: { borderWidth: 1, borderColor: "#d5e0d8", borderRadius: 8, padding: 8, backgroundColor: "#fff" },
  row: { flexDirection: "row", gap: 8 },
  button: { flex: 1, backgroundColor: "#1d5d37", padding: 10, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
  queueText: { fontWeight: "600", color: "#1d5d37" }
});
