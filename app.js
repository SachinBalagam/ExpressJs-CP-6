const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log("DB Error: ${e.message}");
    process.exit(1);
  }
};
initializeDBAndServer();

const convertStateDBObjectToResponseObject = (dbObject) => {
  return {
    StateId: dbObject.state_id,
    StateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDBObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    StateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

// API-1  ALL States

app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT * FROM state ORDER BY state_id;`;
  const states = await db.all(getAllStatesQuery);
  response.send(
    states.map((eachState) => convertStateDBObjectToResponseObject(eachState))
  );
});

// API 2 get state based on state_id

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state WHERE state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertStateDBObjectToResponseObject(state));
});

// API 3 Post District Details

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictDetailsQuery = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`;
  await db.run(postDistrictDetailsQuery);
  response.send("District Successfully Added");
});

// API 4 Get district based on district_id

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetailsQuery = `
    SELECT * FROM district WHERE district_id = ${districtId};`;
  const district = await db.get(getDistrictDetailsQuery);
  response.send(convertDistrictDBObjectToResponseObject(district));
});

// API 5 Delete district based on district_id;

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

// API 6 Update Values of district details based on district_id

app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrictDetailsQuery = `
    UPDATE 
        district 
    SET
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
    WHERE
        district_id = ${districtId};`;
  await db.run(updateDistrictDetailsQuery);
  response.send("District Details Updated");
});

// API 7 Get Stats of state based on state_id

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
    SELECT SUM(cases), SUM(cured), SUM(active), SUM(deaths)
    FROM district WHERE state_id = ${stateId};`;
  const stats = await db.get(getStatsQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

// API 8 Returns an object containing the state name of a district based on the district ID

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateDetails = `
    SELECT 
        state_name 
    FROM 
        district 
    NATURAL JOIN 
        state 
    WHERE 
        district_id = ${districtId};`;
  const stateDetails = await db.get(getStateDetails);
  response.send({ stateName: stateDetails.state_name });
});

module.exports = app;
