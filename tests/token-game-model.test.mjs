import test from 'node:test';
import assert from 'node:assert/strict';
import {createTokens,hitToken,strikeTokens,roundOutcome} from '../site/token-game-model.js';
for(let hp=1;hp<=4;hp++)test(`${hp} hits to destroy; award original token value once`,()=>{
 const token={hp,value:hp*128};
 for(let n=1;n<hp;n++)assert.equal(hitToken(token),0);
 assert.equal(token.hp,1);
 assert.equal(hitToken(token),hp*128);
 assert.equal(hitToken(token),0);
 assert.equal(token.hp,0);
});
test('one projectile damages only nearest block, even across several rows',()=>{
 const tokens=[{hp:1,value:128,y:30},{hp:3,value:384,y:60}];
 const hit=strikeTokens({x:50,y:20,previousY:100},tokens,t=>({x:50,y:t.y,size:20}));
 assert.equal(hit.token,tokens[1]);assert.equal(hit.points,0);
 assert.equal(tokens[0].hp,1);assert.equal(tokens[1].hp,2);
});
test('a horizontal miss does not damage blocks',()=>{
 const token={hp:2,value:256};
 assert.equal(strikeTokens({x:80,y:20,previousY:100},[token],()=>({x:50,y:60,size:20})),null);
 assert.equal(token.hp,2);
});
test('each wave has a bounded formation and all four durability levels',()=>{
 for(let wave=0;wave<10;wave++){
  const tokens=createTokens(wave);assert.equal(tokens.length,55);
  assert.deepEqual([...new Set(tokens.map(t=>t.hp))].sort(),[1,2,3,4]);
  assert.equal(new Set(tokens.map(t=>`${t.col},${t.row}`)).size,55);
 }
});

test('loss only when a surviving token reaches the ship boundary',()=>{
 const token={hp:1,y:350};const geometry=t=>({y:t.y,size:20});
 assert.equal(roundOutcome([token],geometry,378),null);
 token.y=358;assert.equal(roundOutcome([token],geometry,378),'lost');
});
test('clearing all tokens wins, including the final hit at the boundary',()=>{
 const token={hp:1,value:128};hitToken(token);
 assert.equal(roundOutcome([token],()=>({y:400,size:20}),378),'won');
 assert.equal(roundOutcome([],()=>({y:400,size:20}),378),'won');
});
