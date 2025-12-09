"use strict";

const removeUnneededIssueFields = ({
  _id,
  project_name,
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
  project_name,
  issue_title,
  issue_text,
  created_by,
  assigned_to: assigned_to || "",
  status_text: status_text || "",
  open,
  created_on,
  updated_on,
});

module.exports = async function (app) {
  const {
    getAllProjectIssues,
    createNewIssue,
    updateIssueByID,
    deleteIssueByID,
  } = await require("../controllers/issueController");

  app
    .route("/api/issues/:project")

    // ===========================
    // GET
    // ===========================
    .get(getAllProjectIssues, (req, res) => {
      const issues = res.locals.projectIssues.map((issue) =>
        removeUnneededIssueFields(issue),
      );
      return res.json(issues);
    })

    // ===========================
    // POST
    // ===========================
    .post(createNewIssue, (req, res) => {
      const issue = removeUnneededIssueFields(res.locals.issueDoc);
      return res.json(issue);
    })

    // ===========================
    // PUT
    // ===========================
    .put(updateIssueByID, (req, res) => {
      // Los tests NO aceptan {result, _id} solamente
      // NECESITAN el issue COMPLETO después de actualizar

      const updatedIssue = removeUnneededIssueFields(res.locals.updateDoc);

      return res.status(200).json({
        result: "successfully updated",
        ...updatedIssue,
      });
    })

    // ===========================
    // DELETE
    // ===========================
    .delete(deleteIssueByID, (req, res) => {
      return res.json({
        result: "successfully deleted",
        _id: res.locals.deletedID,
      });
    });
};
