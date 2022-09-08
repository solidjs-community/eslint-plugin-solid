// @ts-nocheck
import { render } from "solid-js/web";
import { Suspense } from "solid-js";

import fetchProfileData from "./mock-api";
import ProfilePage from "./profile";

const App = () => {
  const { user, posts, trivia } = fetchProfileData();
  return (
    <Suspense fallback={<h1>Loading...</h1>}>
      <ProfilePage user={user()} posts={posts()} trivia={trivia()} />
    </Suspense>
  );
};

render(App, document.getElementById("app"));
