// @ts-nocheck
import { render, For } from "solid-js/web";
import { createStore, produce } from "solid-js/store";

const App = () => {
  let input;
  let todoId = 0;
  const [store, setStore] = createStore({ todos: [] });
  const addTodo = (text) => {
    setStore(
      "todos",
      produce((todos) => {
        todos.push({ id: ++todoId, text, completed: false });
      })
    );
  };
  const toggleTodo = (id) => {
    setStore(
      "todos",
      (todo) => todo.id === id,
      produce((todo) => (todo.completed = !todo.completed))
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
              <input type="checkbox" checked={todo.completed} onchange={[toggleTodo, id]} />
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
