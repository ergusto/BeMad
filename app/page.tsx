import TodoApp from "./todo-app";

// Server Component shell; the interactive list lives in the client TodoApp.
export default function Home() {
  return (
    <main>
      <h1>BeMad</h1>
      <TodoApp />
    </main>
  );
}
