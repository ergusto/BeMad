import TodoApp from "./todo-app";

// Server Component shell; the interactive list + voiced title live in the client
// TodoApp (inside the VoiceProvider).
export default function Home() {
  return (
    <main>
      <TodoApp />
    </main>
  );
}
