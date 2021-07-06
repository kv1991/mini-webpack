const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');

function getModuleInfo(file) {
  const fileBody = fs.readFileSync(file, 'utf-8');

  const ast = parser.parse(fileBody, {
    sourceType: 'module'
  });

  // console.log('ast: ', ast);

  const deps = {};
  traverse(ast, {
    ImportDeclaration({ node }) {
      console.log('node: ', node);
      const dirname = path.dirname(file);
      const absPath = './' + path.join(dirname, node.source.value);
      deps[node.source.value] = absPath;
    }
  });

  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"]
  });

  const moduleInfo = {
    file,
    deps,
    code
  }

  // console.log('deps: ', deps);
  return moduleInfo;
}

const moduleInfo = getModuleInfo('./src/index.js');
console.log('moduleInfo: ', moduleInfo);