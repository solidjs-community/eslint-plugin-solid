// @ts-nocheck
import { createResource } from "solid-js";

export default function fetchProfileData() {
  const [user] = createResource(fetchUser);
  const [posts] = createResource(fetchPosts);
  const [trivia] = createResource(fetchTrivia);
  return { user, posts, trivia };
}

function fetchUser() {
  console.log("fetch user...");
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("fetched user");
      resolve({
        name: "Ringo Starr",
      });
    }, 500);
  });
}

let ringoPosts = [
  {
    id: 0,
    text: "I get by with a little help from my friends",
  },
  {
    id: 1,
    text: "I'd like to be under the sea in an octupus's garden",
  },
  {
    id: 2,
    text: "You got that sand all over your feet",
  },
];

function fetchPosts() {
  let ringoPostsAtTheTime = ringoPosts;
  console.log("fetch posts...");
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("fetched posts");
      resolve(ringoPostsAtTheTime);
    }, 3000 * Math.random());
  });
}

function fetchTrivia() {
  console.log("fetch trivia...");
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("fetched trivia");
      resolve([
        {
          id: 1,
          text: 'The nickname "Ringo" came from his habit of wearing numerous rings.',
        },
        {
          id: 2,
          text: "Plays the drums left-handed with a right-handed drum set.",
        },
        {
          id: 3,
          text: "Nominated for one Daytime Emmy Award, but did not win",
        },
      ]);
    }, 3000 * Math.random());
  });
}
