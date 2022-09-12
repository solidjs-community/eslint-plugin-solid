// @ts-nocheck
let nextTodoId = 0;
export default {
  addTodo: (text) => ({ type: "ADD_TODO", id: ++nextTodoId, text }),
  toggleTodo: (id) => ({ type: "TOGGLE_TODO", id }),
};
