const {execSync} = require('child_process');
try{
 const commit = execSync('cat .git/refs/remotes/origin/gh-pages').toString().trim();
 console.log('commit',commit);
 const tree = execSync(`git cat-file -p ${commit} | sed -n '1p' | awk '{print $3}'`).toString().trim();
 console.log('tree',tree);
 const list = execSync(`git ls-tree -r ${tree} --name-only`).toString();
 console.log(list);
}catch(e){ console.error('err',e.message); process.exit(1);}