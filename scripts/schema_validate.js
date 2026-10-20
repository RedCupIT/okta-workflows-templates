const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const { execFileSync } = require('child_process');
const path = require('path');

// Fetch the JSON content for schema
let baseDir = process.cwd();
let branchName;
let prWorkFlowJSONFiles;
const workflowSchema = require('./workflow-schema.json');

const SAFE_REF_PATTERN = /^[a-zA-Z0-9._\-\/]+$/;

// Process PR files with only filter workflows/*/*.json
function processPRFiles() {
  console.log (`PR files to validate ${prWorkFlowJSONFiles} for basedir ${baseDir} on ref ${branchName}`);
  const fileArr = prWorkFlowJSONFiles.split(" ").filter(item => item);
  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv, ["uri"]);
  const validate = ajv.compile(workflowSchema);
  fileArr.forEach(file => {
    console.log (`processing file ${file}`);
    const filePath = require(path.resolve(baseDir, file));
    const valid = validate(filePath);
    if (!valid)  {
      console.log(validate.errors);
      process.exit(1);
    } else {
      console.log ('Success');
      process.exit(0);
    }
   });
}

function processArgsAndInitializeVals() {
  if (process.argv.length > 2) {
    console.log('Using ref from command line argument');
    branchName = process.argv[2];
    console.log(`Testing for git branch  ${branchName}`);
  } else if (process.env.CIRCLECI) {
    console.log('Running in CircleCI config');
    branchName = process.env.CIRCLE_SHA1;
  } else {
    console.log('Using HEAD as base');
    branchName = "HEAD"
  }

  if (!SAFE_REF_PATTERN.test(branchName)) {
    console.error(`Invalid git ref: ${branchName}`);
    process.exit(1);
  }

  const diffOutput = execFileSync(
    'git',
    ['diff', '--name-only', `${branchName}..master`, '--', 'workflows/*/*.json'],
    { encoding: 'utf8' }
  );
  prWorkFlowJSONFiles = diffOutput.replace(/\n/g, ' ');
}

processArgsAndInitializeVals();
processPRFiles();
