const express = require('express');
const pool = require('../modules/pool');
const router = express.Router();


// GET all profiles
router.get('/', (req, res) => {
  pool
    .query(`SELECT * FROM "profiles"`)
    .then((result) => {
      res.send(result.rows);
    })
    .catch((error) => {
      res.sendStatus(500);
      console.log('error in getting profiles', error);
    });
});

// GET profile information for specific user
router.get('/:id', async (req, res) => {
  try {
    const queryText = `SELECT * FROM "profiles" WHERE "user_id"=$1`;
    const result = await pool.query(queryText, [req.params.id]);
    const queryText2 = `WITH interests_cte AS (
                            SELECT
                                profiles_interests.profile_id,
                                array_agg(DISTINCT interests.interest) AS interests
                            FROM
                                profiles_interests
                            JOIN
                                interests ON profiles_interests.interest_id = interests.id
                            GROUP BY
                                profiles_interests.profile_id
                        ),
                        availability_cte AS (
                            SELECT
                                profiles_availability.profile_id,
                                array_agg(json_build_object(
                                    'day', availability.day,
                                    'time', availability.time
                                )) AS availability
                            FROM
                                profiles_availability
                            JOIN
                                availability ON profiles_availability.availability_id = availability.id
                            GROUP BY
                                profiles_availability.profile_id
                        )
                        SELECT
                            interests_cte.profile_id,
                            interests_cte.interests,
                            availability_cte.availability
                        FROM
                            interests_cte
                        LEFT JOIN
                            availability_cte ON interests_cte.profile_id = availability_cte.profile_id
                        WHERE interests_cte.profile_id = $1;`;
    const result2 = await pool.query(queryText2, [req.params.id]);
    const response = {
      profile: result.rows[0],
      details: result2.rows[0]
    };
    res.send(response);
  } catch (error) {
    console.log('Error getting profile details', error);
    res.sendStatus(500);
  }
});

// POST new profile
router.post('/', async (req, res) => {
  console.log('/profile POST route');
  try {
    const queryText = `INSERT INTO "profiles" ("user_id", "isMentor", "first_name", "last_name", "email", "gender", "school")
                        VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    await pool.query(queryText, [
      req.user.id,
      req.body.isMentor,
      req.body.first_name,
      req.body.last_name,
      req.body.email,
      req.body.gender,
      req.body.school
    ]);
    const queryText2 = `UPDATE "user" SET "isMentor"=$1 WHERE "user".id=$2;`;
    await pool.query(queryText2, [req.body.isMentor, req.user.id]);
    res.sendStatus(200);
  } catch (error) {
    console.log('Error in post profile', error);
    res.sendStatus(500);
  }
});

// PUT edit profile

// DELETE profile *need to ON DELETE CASCADE mentorships
router.delete('/', async (req, res) => {
  try {
    await pool.query(`DELETE FROM "profiles" WHERE id=$1`, [req.user.id]);
    res.sendStatus(200);
  } catch (error) {
    console.log(' error in deleting a profile', error);
    res.sendStatus(500);
  }
});
module.exports = router;
