export function toTitleCase(str) {
  return str.replace(
    // /\w(\S|\/)*/g,
    /[a-zA-Z]*(\S|\/)+?/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}