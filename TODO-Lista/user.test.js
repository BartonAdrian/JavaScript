const valid = require("./validations");

test('Validate email', () => {
    expect(valid.isValidEmailAddress("email@email.cz")).toEqual(true);
    expect(valid.isValidEmailAddress("email@email.cz")).not.toEqual(false);
    expect(valid.isValidEmailAddress("email|email.cz")).toEqual(false);
    expect(valid.isValidEmailAddress("email|email.cz")).not.toEqual(true);
})

test('Username validation', () => {
    expect(valid.isValidUserName("Adrian")).toEqual(true);
    expect(valid.isValidUserName("Adrian")).not.toEqual(false);
    expect(valid.isValidUserName("Adrian&")).toEqual(false);
    expect(valid.isValidUserName("Adrian&")).not.toEqual(true);
})