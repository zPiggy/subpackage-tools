# Fire fs

node's fs module with some helpful additions.

## Install

```js
    npm install fire-fs
```

## Usage

```js
    var fs = require('fire-fs');
```

## API

### exists(path, callback)

Check if a path exists, callback with a boolean parameter.

### existsSync(path)

Check if a path exists and return the result.

### isDir(path, callback)

Check if a path exists and is a directory, callback with a boolean parameter.

### isDirSync(path)

Check if a path exists and is a directory and return the result.
