import { getPasswordStrength, isValidEmail } from './validation';

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

describe('getPasswordStrength', () => {
  it('空文字の場合はlevel 0・ラベルなしを返す', () => {
    expect(getPasswordStrength('')).toEqual({ level: 0, label: '' });
  });

  it('5文字(6文字未満)で条件を満たさない場合はlevel 0を返す', () => {
    expect(getPasswordStrength('abcde')).toEqual({ level: 0, label: '' });
  });

  it('ちょうど6文字(英字のみ)はlevel 1「弱い」を返す', () => {
    expect(getPasswordStrength('abcdef')).toEqual({ level: 1, label: '弱い' });
  });

  it('6文字以上・英数字混在はlevel 2「普通」を返す', () => {
    expect(getPasswordStrength('abcdef1')).toEqual({ level: 2, label: '普通' });
  });

  it('ちょうど10文字・英数字混在はlevel 3「まあまあ」を返す', () => {
    expect(getPasswordStrength('abcdefghi1')).toEqual({ level: 3, label: 'まあまあ' });
  });

  it('10文字以上・英数字混在・記号ありはlevel 4「強い」を返す', () => {
    expect(getPasswordStrength('abcdefghi1!')).toEqual({ level: 4, label: '強い' });
  });

  it('9文字(10文字未満)は「10文字以上」の条件を満たさない', () => {
    const result = getPasswordStrength('abcdefgh1');
    expect(result.level).toBe(2);
  });

  it('数字のみ(英字を含まない)場合は英数字混在の条件を満たさない', () => {
    const result = getPasswordStrength('123456');
    expect(result.level).toBe(1);
  });
});
