
const asyncHandler = require("../utils/async-handler");
const employeeService = require("../services/employee.service");

const getEmployees = asyncHandler(async (req, res) => {
    const result = await employeeService.getEmployees(
        req.businessId,
        req.query
    );

    res.status(200).json({
        status: "success",
        message: "Employees retrieved successfully.",
        data: result
    });
});

const createEmployee = asyncHandler(async (req, res) => {
    const employee = await employeeService.createEmployee(
        req.businessId,
        req.body
    );

    res.status(201).json({
        status: "success",
        message: "Employee created successfully.",
        data: {
            employee
        }
    });
});

const updateEmployee = asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployee(
        req.businessId,
        req.params.employeeId,
        req.body,
        req.membership.employee_id
    );

    res.status(200).json({
        status: "success",
        message: "Employee updated successfully.",
        data: {
            employee
        }
    });
});

module.exports = {
    getEmployees,
    createEmployee,
    updateEmployee
};
