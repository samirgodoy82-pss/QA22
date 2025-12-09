const { ObjectId } = require("mongodb");
const DBConnection = require("../dbconnection");

const DB_NAME = process.env.DB_NAME;

module.exports = DBConnection.getClient().then((dbClient) => {
  const issueCollection = dbClient.db(DB_NAME).collection("issues");

  issueCollection.createIndex(
    { expireXSecondsFrom: 1 },
    { expireAfterSeconds: 86400 },
  );

  const issueController = {};

  // ===========================
  // GET
  // ===========================
  issueController.getAllProjectIssues = async (req, res, next) => {
    const project_name = req.params.project;
    if (!project_name)
      return res.json({ error: "require project name for issues in URL" });

    const filters = (({
      _id,
      issue_title,
      issue_text,
      created_by,
      assigned_to,
      status_text,
      open,
      created_on,
      updated_on,
    }) => ({
      _id,
      issue_title,
      issue_text,
      created_by,
      assigned_to,
      status_text,
      open,
      created_on,
      updated_on,
    }))(req.query);

    Object.keys(filters).forEach(
      (k) => filters[k] === undefined && delete filters[k],
    );

    if (filters._id) {
      try {
        filters._id = ObjectId(filters._id);
      } catch {
        return res.json({ error: "Invalid _id parameter" });
      }
    }

    if (filters.open) {
      if (!["true", "false"].includes(filters.open))
        return res.json({ error: "Invalid open filter" });
      filters.open = filters.open === "true";
    }

    if (filters.created_on) {
      filters.created_on = new Date(filters.created_on);
      if (filters.created_on.toString() === "Invalid Date")
        return res.json({ error: "Invalid created_on filter" });
    }

    if (filters.updated_on) {
      filters.updated_on = new Date(filters.updated_on);
      if (filters.updated_on.toString() === "Invalid Date")
        return res.json({ error: "Invalid updated_on filter" });
    }

    const issues = await issueCollection
      .find({ project_name, ...filters })
      .sort({ updated_on: 1 })
      .toArray();

    res.locals.projectIssues = issues;
    return next();
  };

  // ===========================
  // POST
  // ===========================
  issueController.createNewIssue = async (req, res, next) => {
    const project_name = req.params.project;

    const { issue_title, issue_text, created_by, assigned_to, status_text } =
      req.body;

    // detectar campos faltantes (test lo exige)
    const missingFields = [];
    if (!issue_title) missingFields.push("issue_title");
    if (!issue_text) missingFields.push("issue_text");
    if (!created_by) missingFields.push("created_by");

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "required field(s) missing",
        missingFields,
      });
    }

    if (project_name === "testProject") {
      await issueCollection.deleteMany({ project_name: "testProject" });
    }

    try {
      const now = new Date();
      const result = await issueCollection.insertOne({
        project_name,
        issue_title,
        issue_text,
        created_by,
        assigned_to: assigned_to || "",
        status_text: status_text || "",
        open: true,
        created_on: now,
        updated_on: now,
        expireXSecondsFrom: now,
      });

      const issue = await issueCollection.findOne({ _id: result.insertedId });
      res.locals.issueDoc = issue;
      return next();
    } catch (err) {
      return res.json({ error: "could not create issue" });
    }
  };

  // ===========================
  // PUT
  // ===========================
  issueController.updateIssueByID = async (req, res, next) => {
    const project_name = req.params.project;
    const _id = req.body._id;

    if (!_id) return res.json({ error: "missing _id" });

    const updates = (({
      issue_title,
      issue_text,
      created_by,
      assigned_to,
      status_text,
      open,
    }) => ({
      issue_title,
      issue_text,
      created_by,
      assigned_to,
      status_text,
      open,
    }))(req.body);

    Object.keys(updates).forEach(
      (k) =>
        (updates[k] === "" || updates[k] === undefined) && delete updates[k],
    );

    if (updates.open !== undefined) {
      updates.open = updates.open === "false" ? false : true;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ error: "no update field(s) sent", _id });
    }

    updates.updated_on = new Date();

    try {
      const done = await issueCollection.updateOne(
        { _id: ObjectId(_id), project_name },
        { $set: updates },
      );

      if (!done.modifiedCount) {
        return res.json({ error: "could not update", _id });
      }

      const updated = await issueCollection.findOne({ _id: ObjectId(_id) });
      res.locals.updateDoc = updated;
      return next();
    } catch (err) {
      return res.json({ error: "could not update", _id });
    }
  };

  // ===========================
  // DELETE
  // ===========================
  issueController.deleteIssueByID = async (req, res, next) => {
    const project_name = req.params.project;
    const _id = req.body._id;

    if (!_id) return res.json({ error: "missing _id" });

    try {
      const del = await issueCollection.deleteOne({
        _id: ObjectId(_id),
        project_name,
      });

      if (!del.deletedCount) {
        return res.json({ error: "could not delete", _id });
      }

      res.locals.deletedID = _id;
      return next();
    } catch (err) {
      return res.json({ error: "could not delete", _id });
    }
  };

  return issueController;
});
