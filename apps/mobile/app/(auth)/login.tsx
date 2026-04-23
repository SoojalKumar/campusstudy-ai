import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Screen } from "../../components/screen";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";

export default function LoginScreen() {
  const { setToken } = useSession();
  const [email, setEmail] = useState("maya@student.pacific.edu");
  const [password, setPassword] = useState("StudentPass123!");
  const [error, setError] = useState<string | null>(null);

  async function login() {
    try {
      const response = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await setToken(response.access_token);
      router.replace("/(tabs)");
    } catch (nextError) {
      setError((nextError as Error).message);
    }
  }

  return (
    <Screen>
      <Text style={{ color: "#f4f7fb", fontSize: 32, fontWeight: "700" }}>CampusStudy AI</Text>
      <Text style={{ color: "#a6b4c9", fontSize: 16 }}>
        Sign in and review due cards between classes.
      </Text>
      <View style={{ gap: 12, marginTop: 16 }}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#7f8ea3"
          style={{
            backgroundColor: "#0d1321",
            borderRadius: 18,
            color: "#f4f7fb",
            padding: 16
          }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#7f8ea3"
          style={{
            backgroundColor: "#0d1321",
            borderRadius: 18,
            color: "#f4f7fb",
            padding: 16
          }}
        />
      </View>
      {error ? <Text style={{ color: "#ff8b5d" }}>{error}</Text> : null}
      <Pressable
        onPress={login}
        style={{ backgroundColor: "#73c9c7", borderRadius: 18, padding: 16, marginTop: 8 }}
      >
        <Text style={{ color: "#081019", fontWeight: "700", textAlign: "center" }}>Sign In</Text>
      </Pressable>
    </Screen>
  );
}
