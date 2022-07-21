const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(4000, () => {
      console.log("Server Running at http://localhost:4000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

/// AUTHENTICATION TOKEN
const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.usernameOfLoginPerson = payload.username;
        next();
      }
    });
  }
};

///userDetails Checking for registration
const userDetailsCheckingForRegistration = async (request, response, next) => {
  const { username, password } = request.body;
  const userCheckingQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDB = await db.get(userCheckingQuery);
  if (userDB === undefined) {
    ///if user not exists then checking password length
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      ///if user not exists then password length ok
      next();
    }
  } else {
    ///in case user already exists
    response.status(400);
    response.send("User already exists");
  }
};

///API 1 Registration
app.post(
  /register/,
  userDetailsCheckingForRegistration,
  async (request, response) => {
    const { username, password, name, gender } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const addUserQuery = `
    INSERT INTO
      user (
      name,
      username,
      password,
      gender)
    VALUES
      (
       
        '${name}',
        '${username}',
        '${hashedPassword}',
        '${gender}'
         
      );`;

    const dbResponse = await db.run(addUserQuery);
    const districtId = dbResponse.lastID;
    console.log(districtId);
    response.send("User created successfully");
  }
);

///API 2 Login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDB = await db.get(userQuery);
  if (userDB === undefined) {
    ///if user details not found
    response.status(400);
    response.send("Invalid user");
  } else {
    /// if user details found then password checking
    const isPasswordMatch = await bcrypt.compare(password, userDB.password);
    if (isPasswordMatch === true) {
      ///if password ok then sending jwt Tokeb
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");

      response.status(200);
      response.send({ jwtToken });
    } else {
      /// if user details found but password incorrect
      response.status(400);
      response.send("Invalid password");
    }
  }
});

///API3 Getting Latest 4 tweets
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { usernameOfLoginPerson } = request;
  const getTweetsQuery = `
    SELECT
      user.username AS username,
      tweet,
      date_time AS dateTime
    FROM
      tweet 
      INNER JOIN  user ON tweet.user_id==user.user_id
    
      

      
      ORDER BY date_time DESC
      LIMIT 4;
      `;
  const tweetsArray = await db.all(getTweetsQuery);
  response.send(tweetsArray);
});

/*
const convertToResponseData = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

const convertToResponseOfDistrict = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

/// AUTHENTICATION TOKEN
const authenticateToken = async (request, response, next) => {
  //below condition for query with user details
  if (request.body.username !== undefined) {
    const { username, password } = request.body;
    const userQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const userDB = await db.get(userQuery);
    if (userDB === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isPasswordMatch = await bcrypt.compare(password, userDB.password);
      if (isPasswordMatch === true) {
        const payload = {
          username: username,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");

        response.status(200);
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    } //below condition for query with token
  } else {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  }
};

///API 1
app.get("/register/", authenticateToken, async (request, response) => {
  const getStateQuery = `
    SELECT
      *
    FROM
      state`;
  const state = await db.all(getStateQuery);
  response.send(state.map((each) => convertToResponseData(each)));
});

//API 2
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
      *
    FROM
      state
    WHERE
      state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertToResponseData(state));
});

///API 3
app.post(/register/, authenticateToken, async (request, response) => {
  const districtDetails3 = request.body;

  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails3;
  const addDistrictQuery = `
    INSERT INTO
      district (
district_name,
state_id,
cases,
cured,
active,
deaths)
    VALUES
      (
       
        '${districtName}',
         ${stateId},
         ${cases},
         ${cured},
         ${active},
        '${deaths}'
      );`;

  const dbResponse = await db.run(addDistrictQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

///API 4
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
    SELECT
      *
    FROM
      district
    WHERE
      district_id = ${districtId};`;
    const district = await db.get(getDistrictQuery);
    response.send(convertToResponseOfDistrict(district));
  }
);

///API 5
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`;
    await db.run(deleteDistrictQuery);
    response.send("District Removed");
  }
);

///API 6
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateDistrictQuery = `
    UPDATE
      district
    SET
      
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured}, 
      active=${active},
      deaths=${deaths}
    WHERE
      district_id = ${districtId};`;
    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

///API 7
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getBookQuery = `
    SELECT
      sum(cases) AS totalCases,
      sum(cured) As totalCured,
      sum(active) As totalActive,
      sum(deaths) AS totalDeaths
    FROM
      district LEFT JOIN  state
      ON district.state_id = state.state_id
    WHERE
      state.state_id = ${stateId};`;
    const totalStatus = await db.get(getBookQuery);
    response.send(totalStatus);
  }
);

///API 8
app.get(
  "/districts/:districtId/details/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDisQuery = `
    SELECT
      state.state_name
    FROM
      state NATURAL JOIN  district
     
    WHERE
      district.district_id LIKE ${districtId};`;
    const dis = await db.get(getDisQuery);
    response.send(dis);
  }
);

/// API 1 login s-1
app.post("/login/", authenticateToken, async (request, response) => {});
*/
initializeDBAndServer();
module.exports = app;
