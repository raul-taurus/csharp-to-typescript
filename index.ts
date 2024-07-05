import commandLineArgs from "command-line-args";
import { existsSync, readFileSync, writeFileSync } from "fs";

const ClassNameReg = / class (\w+)/;
const FieldNameReg = /\[JsonProperty\("(\w+)"\)\]/;
const FieldTypeReg = /public(?:\s+)((\S+?)(\??))(?:\s+)(?:\w+)/;

const DotnetStructTypes = [
  "bool",
  "int",
  "decimal",
  "double",
  "Guid",
  "DateTime",
];

type FieldDef = { name: string; type: string; nullable?: boolean };
const optionDefinitions = [
  { name: "input", alias: "i", type: String },
  { name: "outDir", alias: "o", type: String },
];

function main() {
  const options = commandLineArgs(optionDefinitions) as {
    input: string;
    outDir: string;
  };
  if (
    options.input &&
    options.outDir &&
    existsSync(options.input) &&
    existsSync(options.outDir)
  ) {
    const allTypes = new Set<string>();
    const fileContent = readFileSync(options.input, "utf-8");
    const lines = fileContent.split("\n");
    let className = "";
    let fields: FieldDef[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const classNameMatch = ClassNameReg.exec(line);
      if (classNameMatch) {
        if (className && fields.length > 0) {
          generateType(className, fields, options);
          className = "";
          fields = [];
        }

        className = classNameMatch[1];
        continue;
      }
      const fieldNameMatch = FieldNameReg.exec(line);
      if (fieldNameMatch) {
        const fieldTypeMatch = FieldTypeReg.exec(lines[i + 1]);
        if (fieldTypeMatch) {
          fields.push({
            name: fieldNameMatch[1],
            type: fieldTypeMatch[2],
            nullable:
              !!fieldTypeMatch[3] ||
              !DotnetStructTypes.includes(fieldTypeMatch[2]),
          });
          allTypes.add(fieldTypeMatch[1]);
          i = i + 1;
        }
      }
    }

    if (className && fields.length > 0) {
      generateType(className, fields, options);
      className = "";
      fields = [];
    }
    console.log("All types are generated");
  } else {
    console.log("Invalid input file or output directory");
    console.log("Usage: node index.ts -i <input-file> -o <output-directory>");
  }
}

function generateType(
  className: string,
  fields: FieldDef[],
  options: { outDir: string }
) {
  const content = `export type ${className} = {
${fields
  .map((field) => `  ${field.name}${field.nullable ? "?" : ""}: ${field.type}`)
  .join("\n")}
}`;
  writeFileSync(`${options.outDir}/${className}.ts`, content);
}

main();
