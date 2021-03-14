import { route } from './read';

describe('routes/read', () => {

  it('should return a function', () => {
    expect(typeof route()).toEqual('function');
  })
});
