// @ts-nocheck
import { render } from "solid-js/web";
import { createStore } from "solid-js/store";
import { useForm } from "./validation";
import "./styles.css";

const EMAILS = ["johnsmith@outlook.com", "mary@gmail.com", "djacobs@move.org"];

function fetchUserName(name) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(EMAILS.indexOf(name) > -1), 200);
  });
}

const ErrorMessage = (props) => <span class="error-message">{props.error}</span>;

const App = () => {
  const { validate, formSubmit, errors } = useForm({
    errorClass: "error-input"
  });
  const [fields, setFields] = createStore();
  const fn = (form) => {
    // form.submit()
    console.log("Done");
  };
  const userNameExists = async ({ value }) => {
    const exists = await fetchUserName(value);
    return exists && `${value} is already being used`;
  };
  const matchesPassword = ({ value }) =>
    value === fields.password ? false : "Passwords must Match";

  return (
    <form use:formSubmit={fn}>
      <h1>Sign Up</h1>
      <div class="field-block">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          use:validate={[userNameExists]}
        />
        {errors.email && <ErrorMessage error={errors.email} />}
      </div>
      <div class="field-block">
        <input
          type="password"
          name="password"
          placeholder="Password"
          required=""
          minlength="8"
          onInput={(e) => setFields("password", e.target.value)}
          use:validate
        />
        {errors.password && <ErrorMessage error={errors.password} />}
      </div>
      <div class="field-block">
        <input
          type="password"
          name="confirmpassword"
          placeholder="Confirm Password"
          required=""
          use:validate={[matchesPassword]}
        />
        {errors.confirmpassword && (
          <ErrorMessage error={errors.confirmpassword} />
        )}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
};

render(App, document.getElementById("app"));
