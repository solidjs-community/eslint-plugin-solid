import { run, tsOnly } from "../ruleTester";
import rule from "../../src/rules/no-array-handlers";

export const cases = run("no-array-handlers", rule, {
  valid: [
    `let el = <button style={{background: 'red'}} onClick={() => 9001} />`,
    `const handler = () => 1+1;
    let el = <button onClick={handler} />`,
    `let el = <button onclick={() => 9001} />`,
    `const handler = () => 1+1;
    let el = <button style={{background: 'pink'}} onclick={handler} />`,
    `let el = <button attr:click={[(x) => x, 9001]} />`,
    `let el = <button prop:onClick={[(x) => x, 9001]} />`,
    `let el = <button on:Click={() => 1+1} />`,
    `function Component(props) {
      return <div onClick={props.onClick} />;
    }`,
    `<button onClick={() => [handler, "abc"]} />`,
    `<button onClick={() => [handler, {data:true}]} /> `,
    {
      code: `function Component() {
      return <div onClick={[(n: number) => n*n, 2] as SafeArray<number>} />;
    }`,
      [tsOnly]: true,
    },
  ],
  invalid: [
    {
      code: `let el = <button onClick={[(n) => console.log(n), 'str']} />`,
      errors: [{ messageId: "noArrayHandlers" }],
    },
    {
      code: `let el = <button onClick={[(k: string) => k.toUpperCase(), 'hello']} />`,
      errors: [{ messageId: "noArrayHandlers" }],
      [tsOnly]: true,
    },
    {
      code: `let el = <div onMouseOver={[1,2,3]} />`,
      errors: [{ messageId: "noArrayHandlers" }],
    },
    {
      code: `let el = <div on:click={[handler, i()]} />`,
      errors: [{ messageId: "noArrayHandlers" }],
    },
    {
      code: `let el = <button type="button" onclick={[handler, i() + 2]} class="btn" />`,
      errors: [{ messageId: "noArrayHandlers" }],
    },
    {
      code: `let handler = [(x) => x*2, 54];
      let el = <button style={{background: 'pink'}} onclick={handler} />`,
      errors: [{ messageId: "noArrayHandlers" }],
    },
    {
      code: `const thing = (props) => <div onclick={[props.callback, props.id]}><button type="button" onclick={handler} class="btn" /></div>`,
      errors: [{ messageId: "noArrayHandlers" }],
    },
    {
      code: `function Component() {
      const arr = [(n: number) => n*n, 2];
      return <div onClick={arr} />;
    }`,
      errors: [{ messageId: "noArrayHandlers" }],
      [tsOnly]: true,
    },
  ],
});
