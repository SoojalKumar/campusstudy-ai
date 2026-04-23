import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "../../components/screen";
import { mobileCourses } from "../../lib/demo-data";

export default function CoursesScreen() {
  return (
    <Screen>
      <Text style={{ color: "#f4f7fb", fontSize: 30, fontWeight: "700" }}>Courses</Text>
      {mobileCourses.map((course) => (
        <Link key={course.id} href={`/courses/${course.id}`} asChild>
          <Pressable style={{ backgroundColor: "#0d1321", borderRadius: 24, padding: 18 }}>
            <Text style={{ color: "#73c9c7", fontSize: 13 }}>{course.code}</Text>
            <Text style={{ color: "#f4f7fb", fontSize: 18, fontWeight: "700", marginTop: 6 }}>
              {course.title}
            </Text>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}
