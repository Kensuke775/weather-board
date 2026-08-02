import { isValidEmail } from './validation';

describe('isValidEmail', () => {
  it('通常のメールアドレスは true と判定する', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  it('サブドメインを含むメールアドレスは true と判定する', () => {
    expect(isValidEmail('test@mail.example.co.jp')).toBe(true);
  });

  it('@がない場合は false と判定する', () => {
    expect(isValidEmail('testexample.com')).toBe(false);
  });

  it('@の前(ローカル部)が空の場合は false と判定する', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('@の後(ドメイン部)が空の場合は false と判定する', () => {
    expect(isValidEmail('test@')).toBe(false);
  });

  it('ドメイン部にドットがない場合は false と判定する', () => {
    expect(isValidEmail('test@example')).toBe(false);
  });

  it('空文字の場合は false と判定する', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('スペースを含む場合は false と判定する', () => {
    expect(isValidEmail('test user@example.com')).toBe(false);
  });
});
