import { Text, View } from "react-native";

export default function StatusPill({ online }) {
  return (
    <View style={{ backgroundColor: online ? "#D7F3E0" : "#FFF1CC", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
      <Text>{online ? "Online" : "Offline Mode"}</Text>
    </View>
  );
}
