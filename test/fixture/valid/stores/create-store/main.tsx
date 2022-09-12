// @ts-nocheck
import { render } from "solid-js/web";
import { For } from "solid-js";
import { createStore } from "solid-js/store";

const App = () => {
  let input;
  let todoId = 0;
  const [store, setStore] = createStore({ todos: [] });
  const addTodo = (text) => {
    setStore("todos", (todos) => [...todos, { id: ++todoId, text, completed: false }]);
  };
  const toggleTodo = (id) => {
    setStore(
      "todos",
      (todo) => todo.id === id,
      "completed",
      (completed) => !completed
    );
  };

  return (
    <>
      <div>
        <input ref={input} />
        <button
          onClick={() => {
            if (!input.value.trim()) return;
            addTodo(input.value);
            input.value = "";
          }}
        >
          Add Todo
        </button>
      </div>
      <For each={store.todos}>
        {(todo) => {
          const { id, text } = todo;
          console.log(`Creating ${text}`);
          return (
            <div>
              <input type="checkbox" checked={todo.completed} onChange={[toggleTodo, id]} />
              <span style={{ "text-decoration": todo.completed ? "line-through" : "none" }}>
                {text}
              </span>
            </div>
          );
        }}
      </For>
    </>
  );
};

render(App, document.getElementById("app"));
