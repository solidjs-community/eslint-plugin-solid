const regex = /^[a-z]/;
export const isDOMElementName = (name: string): boolean => {
  return regex.test(name);
};
