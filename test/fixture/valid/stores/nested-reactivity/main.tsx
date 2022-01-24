// @ts-nocheck
import { render } from "solid-js/web";
import { For, createSignal } from "solid-js";

const App = () => {
  const [todos, setTodos] = createSignal([]);
  let input;
  let todoId = 0;

  const addTodo = (text) => {
    const [completed, setCompleted] = createSignal(false);
    setTodos([...todos(), { id: ++todoId, text, completed, setCompleted }]);
  };
  const toggleTodo = (id) => {
    const index = todos().findIndex((t) => t.id === id);
    const todo = todos()[index];
    if (todo) todo.setCompleted(!todo.completed());
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
      <For each={todos()}>
        {(todo) => {
          const { id, text } = todo;
          console.log(`Creating ${text}`);
          return (
            <div>
              <input type="checkbox" checked={todo.completed()} onchange={[toggleTodo, id]} />
              <span style={{ "text-decoration": todo.completed() ? "line-through" : "none" }}>
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
