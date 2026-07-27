import { rgbStringToRgba } from './WeatherCard';

describe('rgbStringToRgba', () => {
  it('rgb文字列からr,g,bを取り出し、指定したalphaのrgba文字列を返す', () => {
    expect(rgbStringToRgba('rgb(255, 188, 161)', 0.5)).toBe('rgba(255,188,161,0.5)');
  });

  it('数値間のスペースの有無によらず動作する', () => {
    expect(rgbStringToRgba('rgb(0,0,0)', 0.2)).toBe('rgba(0,0,0,0.2)');
  });

  it('alphaが0でも動作する', () => {
    expect(rgbStringToRgba('rgb(10, 20, 30)', 0)).toBe('rgba(10,20,30,0)');
  });
});
