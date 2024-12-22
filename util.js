/*
  Copyright 2024 Sean M. Brennan and contributors

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import * as path from "path"
import * as fs from "node:fs"

// Given a blog directory (of markdown files), update the index.html
// Not necessary when RepoBlog is used as intended (from a repo with an API)
export default function update_blog(dir) {
    const entries = fs.readdirSync(dir)
    let html = `<!DOCTYPE html>
<html lang="en">
  <body>
    <table>
      <thead>
        <tr class="header" id="theader">
          <th id="nameColumnHeader">Name</th>
          <th id="sizeColumnHeader">Size</th>
          <th id="dateColumnHeader">Modified</th>
        </tr>
      </thead>
      <tbody id="tbody">\n`

    entries.forEach(entry => {
        if (entry.startsWith(".") || entry === "index.html")
            return
        const stats = fs.statSync(path.join(dir, entry))

        html += `        <tr>\n`
        html += `          <td><a href="${entry}">${entry}</a></td>\n`
        if (stats.isDirectory()) {
            html += `          <td></td>\n`
        } else {
            html += `          <td>${stats.size}</td>\n`
        }
        html += `          <td>${stats.mtime}</td>\n`
        html += `        </tr>\n`
    })
    html += `      </tbody>
    </table>
  </body>
</html>\n`

    fs.writeFile(path.join(dir, "index.html"), html,
        (err)=> console.error(err))
}