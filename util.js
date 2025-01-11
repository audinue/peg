const ruleName = (id) => {
  return "parse" + id.charAt(0).toUpperCase() + id.substring(1);
};

export { ruleName };
