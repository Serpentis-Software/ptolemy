import { isText } from './isText.js';

class X {}

it('multiple', () => {
    expect(isText('test')).toStrictEqual(true);
    expect(isText(1)).toStrictEqual(true);
    expect(isText(123.456)).toStrictEqual(true);

    expect(isText(true)).toStrictEqual(false);
    expect(isText(false)).toStrictEqual(false);
    expect(isText(null)).toStrictEqual(false);
    expect(isText(undefined)).toStrictEqual(false);
    expect(isText(function () {})).toStrictEqual(false);
    expect(isText(new X())).toStrictEqual(false);
});
