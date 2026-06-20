const demoDatabases = {
  university: {
    name: "University Management Database",
    suggestedPrompts: [
      "Show top 10 students by GPA",
      "Which department offers the most courses?",
      "Find students who failed more than 2 courses",
      "Show instructor salaries by department",
      "Generate course enrollment report",
      "Explain student-course relationships"
    ],
    schema: {
      Students: {
        columns: [
          { name: "student_id", type: "INT", primaryKey: true },
          { name: "first_name", type: "VARCHAR(50)" },
          { name: "last_name", type: "VARCHAR(50)" },
          { name: "date_of_birth", type: "DATE" },
          { name: "email", type: "VARCHAR(100)" },
          { name: "department_id", type: "INT" },
          { name: "enrollment_date", type: "DATE" },
          { name: "gpa", type: "DECIMAL(3,2)" }
        ]
      },
      Departments: {
        columns: [
          { name: "department_id", type: "INT", primaryKey: true },
          { name: "department_name", type: "VARCHAR(100)" },
          { name: "building", type: "VARCHAR(50)" },
          { name: "budget", type: "DECIMAL(10,2)" }
        ]
      },
      Courses: {
        columns: [
          { name: "course_id", type: "INT", primaryKey: true },
          { name: "course_name", type: "VARCHAR(100)" },
          { name: "credits", type: "INT" },
          { name: "department_id", type: "INT" },
          { name: "instructor_id", type: "INT" }
        ]
      },
      Enrollments: {
        columns: [
          { name: "enrollment_id", type: "INT", primaryKey: true },
          { name: "student_id", type: "INT" },
          { name: "course_id", type: "INT" },
          { name: "semester", type: "VARCHAR(20)" },
          { name: "year", type: "INT" },
          { name: "grade", type: "VARCHAR(2)" }
        ]
      },
      Instructors: {
        columns: [
          { name: "instructor_id", type: "INT", primaryKey: true },
          { name: "first_name", type: "VARCHAR(50)" },
          { name: "last_name", type: "VARCHAR(50)" },
          { name: "email", type: "VARCHAR(100)" },
          { name: "department_id", type: "INT" },
          { name: "salary", type: "DECIMAL(10,2)" }
        ]
      },
      Attendance: {
        columns: [
          { name: "attendance_id", type: "INT", primaryKey: true },
          { name: "student_id", type: "INT" },
          { name: "course_id", type: "INT" },
          { name: "date", type: "DATE" },
          { name: "status", type: "VARCHAR(20)" }
        ]
      },
      Examinations: {
        columns: [
          { name: "exam_id", type: "INT", primaryKey: true },
          { name: "course_id", type: "INT" },
          { name: "exam_date", type: "DATE" },
          { name: "max_marks", type: "INT" }
        ]
      }
    },
    relationships: [
      { from: "Students", to: "Departments", type: "Many-to-One" },
      { from: "Courses", to: "Departments", type: "Many-to-One" },
      { from: "Courses", to: "Instructors", type: "Many-to-One" },
      { from: "Enrollments", to: "Students", type: "Many-to-One" },
      { from: "Enrollments", to: "Courses", type: "Many-to-One" },
      { from: "Attendance", to: "Students", type: "Many-to-One" },
      { from: "Attendance", to: "Courses", type: "Many-to-One" },
      { from: "Examinations", to: "Courses", type: "Many-to-One" }
    ]
  },
  employee: {
    name: "Employee Management Database",
    suggestedPrompts: [
      "Show employees with salary above 80000",
      "Which department has maximum employees?",
      "Find top 5 highest paid employees",
      "Generate payroll summary",
      "Show employees with attendance below 80%",
      "Explain department-project relationships"
    ],
    schema: {
      Employees: {
        columns: [
          { name: "EmployeeID", type: "INT", primaryKey: true },
          { name: "FirstName", type: "VARCHAR(50)" },
          { name: "LastName", type: "VARCHAR(50)" },
          { name: "DateOfBirth", type: "DATE" },
          { name: "Gender", type: "CHAR(1)" },
          { name: "Email", type: "VARCHAR(100)" },
          { name: "PhoneNumber", type: "VARCHAR(20)" },
          { name: "HireDate", type: "DATE" },
          { name: "JobTitle", type: "VARCHAR(100)" },
          { name: "Salary", type: "DECIMAL(10,2)" },
          { name: "DepartmentID", type: "INT" },
          { name: "ManagerID", type: "INT" }
        ]
      },
      Departments: {
        columns: [
          { name: "DepartmentID", type: "INT", primaryKey: true },
          { name: "DepartmentName", type: "VARCHAR(100)" },
          { name: "Location", type: "VARCHAR(100)" },
          { name: "Budget", type: "DECIMAL(12,2)" },
          { name: "ManagerID", type: "INT" }
        ]
      },
      Projects: {
        columns: [
          { name: "ProjectID", type: "INT", primaryKey: true },
          { name: "ProjectName", type: "VARCHAR(100)" },
          { name: "StartDate", type: "DATE" },
          { name: "EndDate", type: "DATE" },
          { name: "Budget", type: "DECIMAL(12,2)" },
          { name: "DepartmentID", type: "INT" }
        ]
      },
      EmployeeProject: {
        columns: [
          { name: "EmployeeID", type: "INT", primaryKey: true },
          { name: "ProjectID", type: "INT", primaryKey: true },
          { name: "Role", type: "VARCHAR(50)" },
          { name: "HoursPerWeek", type: "DECIMAL(5,2)" }
        ]
      },
      Attendance: {
        columns: [
          { name: "AttendanceID", type: "INT", primaryKey: true },
          { name: "EmployeeID", type: "INT" },
          { name: "Date", type: "DATE" },
          { name: "Status", type: "VARCHAR(20)" },
          { name: "CheckInTime", type: "TIME" },
          { name: "CheckOutTime", type: "TIME" }
        ]
      },
      Payroll: {
        columns: [
          { name: "PayrollID", type: "INT", primaryKey: true },
          { name: "EmployeeID", type: "INT" },
          { name: "Month", type: "INT" },
          { name: "Year", type: "INT" },
          { name: "BaseSalary", type: "DECIMAL(12,2)" },
          { name: "Bonus", type: "DECIMAL(12,2)" },
          { name: "Deductions", type: "DECIMAL(12,2)" },
          { name: "NetSalary", type: "DECIMAL(12,2)" }
        ]
      },
      Performance: {
        columns: [
          { name: "PerformanceID", type: "INT", primaryKey: true },
          { name: "EmployeeID", type: "INT" },
          { name: "ReviewDate", type: "DATE" },
          { name: "Rating", type: "DECIMAL(3,2)" },
          { name: "Comments", type: "TEXT" }
        ]
      }
    },
    relationships: [
      { from: "Employees", to: "Departments", type: "Many-to-One" },
      { from: "Employees", to: "Employees", type: "Many-to-One", via: "ManagerID" },
      { from: "Projects", to: "Departments", type: "Many-to-One" },
      { from: "EmployeeProject", to: "Employees", type: "Many-to-One" },
      { from: "EmployeeProject", to: "Projects", type: "Many-to-One" },
      { from: "Attendance", to: "Employees", type: "Many-to-One" },
      { from: "Payroll", to: "Employees", type: "Many-to-One" },
      { from: "Performance", to: "Employees", type: "Many-to-One" }
    ]
  },
  "e-commerce": {
    name: "E-Commerce Database",
    suggestedPrompts: [
      "Show top 10 best-selling products",
      "Which customer has the most orders?",
      "Find products out of stock",
      "Generate monthly sales report",
      "Show product reviews with ratings",
      "Explain customer-order relationships"
    ],
    schema: {
      Customers: {
        columns: [
          { name: "customer_id", type: "INT", primaryKey: true },
          { name: "first_name", type: "VARCHAR(50)" },
          { name: "last_name", type: "VARCHAR(50)" },
          { name: "email", type: "VARCHAR(100)" },
          { name: "phone", type: "VARCHAR(20)" },
          { name: "registration_date", type: "DATE" }
        ]
      },
      Products: {
        columns: [
          { name: "product_id", type: "INT", primaryKey: true },
          { name: "product_name", type: "VARCHAR(200)" },
          { name: "category", type: "VARCHAR(100)" },
          { name: "price", type: "DECIMAL(10,2)" },
          { name: "stock_quantity", type: "INT" },
          { name: "supplier_id", type: "INT" }
        ]
      },
      Orders: {
        columns: [
          { name: "order_id", type: "INT", primaryKey: true },
          { name: "customer_id", type: "INT" },
          { name: "order_date", type: "DATE" },
          { name: "total_amount", type: "DECIMAL(12,2)" },
          { name: "shipping_address", type: "VARCHAR(500)" },
          { name: "status", type: "VARCHAR(50)" }
        ]
      },
      OrderItems: {
        columns: [
          { name: "order_item_id", type: "INT", primaryKey: true },
          { name: "order_id", type: "INT" },
          { name: "product_id", type: "INT" },
          { name: "quantity", type: "INT" },
          { name: "unit_price", type: "DECIMAL(10,2)" }
        ]
      },
      Suppliers: {
        columns: [
          { name: "supplier_id", type: "INT", primaryKey: true },
          { name: "supplier_name", type: "VARCHAR(100)" },
          { name: "contact_name", type: "VARCHAR(100)" },
          { name: "email", type: "VARCHAR(100)" },
          { name: "phone", type: "VARCHAR(20)" }
        ]
      },
      Payments: {
        columns: [
          { name: "payment_id", type: "INT", primaryKey: true },
          { name: "order_id", type: "INT" },
          { name: "payment_date", type: "DATE" },
          { name: "amount", type: "DECIMAL(12,2)" },
          { name: "payment_method", type: "VARCHAR(50)" }
        ]
      },
      Inventory: {
        columns: [
          { name: "inventory_id", type: "INT", primaryKey: true },
          { name: "product_id", type: "INT" },
          { name: "warehouse_location", type: "VARCHAR(100)" },
          { name: "quantity", type: "INT" }
        ]
      },
      Reviews: {
        columns: [
          { name: "review_id", type: "INT", primaryKey: true },
          { name: "product_id", type: "INT" },
          { name: "customer_id", type: "INT" },
          { name: "rating", type: "INT" },
          { name: "comment", type: "TEXT" },
          { name: "review_date", type: "DATE" }
        ]
      }
    },
    relationships: [
      { from: "Orders", to: "Customers", type: "Many-to-One" },
      { from: "Products", to: "Suppliers", type: "Many-to-One" },
      { from: "OrderItems", to: "Orders", type: "Many-to-One" },
      { from: "OrderItems", to: "Products", type: "Many-to-One" },
      { from: "Payments", to: "Orders", type: "Many-to-One" },
      { from: "Inventory", to: "Products", type: "Many-to-One" },
      { from: "Reviews", to: "Products", type: "Many-to-One" },
      { from: "Reviews", to: "Customers", type: "Many-to-One" }
    ]
  },
  hospital: {
    name: "Hospital Management Database",
    suggestedPrompts: [
      "Show patients admitted in last 30 days",
      "Which doctor has the most appointments?",
      "Find patients with diabetes diagnosis",
      "Generate billing report",
      "Show doctor specialties",
      "Explain patient-doctor relationships"
    ],
    schema: {
      Patients: {
        columns: [
          { name: "patient_id", type: "INT", primaryKey: true },
          { name: "first_name", type: "VARCHAR(50)" },
          { name: "last_name", type: "VARCHAR(50)" },
          { name: "date_of_birth", type: "DATE" },
          { name: "gender", type: "CHAR(1)" },
          { name: "phone", type: "VARCHAR(20)" },
          { name: "address", type: "VARCHAR(500)" }
        ]
      },
      Doctors: {
        columns: [
          { name: "doctor_id", type: "INT", primaryKey: true },
          { name: "first_name", type: "VARCHAR(50)" },
          { name: "last_name", type: "VARCHAR(50)" },
          { name: "specialization", type: "VARCHAR(100)" },
          { name: "phone", type: "VARCHAR(20)" },
          { name: "email", type: "VARCHAR(100)" },
          { name: "department_id", type: "INT" }
        ]
      },
      Departments: {
        columns: [
          { name: "department_id", type: "INT", primaryKey: true },
          { name: "department_name", type: "VARCHAR(100)" },
          { name: "floor", type: "INT" }
        ]
      },
      Appointments: {
        columns: [
          { name: "appointment_id", type: "INT", primaryKey: true },
          { name: "patient_id", type: "INT" },
          { name: "doctor_id", type: "INT" },
          { name: "appointment_date", type: "DATETIME" },
          { name: "status", type: "VARCHAR(50)" },
          { name: "notes", type: "TEXT" }
        ]
      },
      MedicalRecords: {
        columns: [
          { name: "record_id", type: "INT", primaryKey: true },
          { name: "patient_id", type: "INT" },
          { name: "doctor_id", type: "INT" },
          { name: "visit_date", type: "DATE" },
          { name: "diagnosis", type: "TEXT" },
          { name: "prescription", type: "TEXT" },
          { name: "notes", type: "TEXT" }
        ]
      },
      Billing: {
        columns: [
          { name: "bill_id", type: "INT", primaryKey: true },
          { name: "patient_id", type: "INT" },
          { name: "bill_date", type: "DATE" },
          { name: "total_amount", type: "DECIMAL(12,2)" },
          { name: "payment_status", type: "VARCHAR(50)" }
        ]
      }
    },
    relationships: [
      { from: "Doctors", to: "Departments", type: "Many-to-One" },
      { from: "Appointments", to: "Patients", type: "Many-to-One" },
      { from: "Appointments", to: "Doctors", type: "Many-to-One" },
      { from: "MedicalRecords", to: "Patients", type: "Many-to-One" },
      { from: "MedicalRecords", to: "Doctors", type: "Many-to-One" },
      { from: "Billing", to: "Patients", type: "Many-to-One" }
    ]
  },
  banking: {
    name: "Banking Database",
    suggestedPrompts: [
      "Show customers with balance above 100000",
      "Which account type has the most customers?",
      "Find transactions above 50000",
      "Generate monthly transaction report",
      "Show active loans",
      "Explain customer-account relationships"
    ],
    schema: {
      Customers: {
        columns: [
          { name: "customer_id", type: "INT", primaryKey: true },
          { name: "first_name", type: "VARCHAR(50)" },
          { name: "last_name", type: "VARCHAR(50)" },
          { name: "date_of_birth", type: "DATE" },
          { name: "email", type: "VARCHAR(100)" },
          { name: "phone", type: "VARCHAR(20)" },
          { name: "address", type: "VARCHAR(500)" }
        ]
      },
      Accounts: {
        columns: [
          { name: "account_id", type: "INT", primaryKey: true },
          { name: "customer_id", type: "INT" },
          { name: "account_type", type: "VARCHAR(50)" },
          { name: "balance", type: "DECIMAL(15,2)" },
          { name: "currency", type: "VARCHAR(10)" },
          { name: "opening_date", type: "DATE" },
          { name: "branch_id", type: "INT" }
        ]
      },
      Transactions: {
        columns: [
          { name: "transaction_id", type: "INT", primaryKey: true },
          { name: "account_id", type: "INT" },
          { name: "transaction_type", type: "VARCHAR(50)" },
          { name: "amount", type: "DECIMAL(15,2)" },
          { name: "transaction_date", type: "DATETIME" },
          { name: "description", type: "VARCHAR(500)" }
        ]
      },
      Loans: {
        columns: [
          { name: "loan_id", type: "INT", primaryKey: true },
          { name: "customer_id", type: "INT" },
          { name: "loan_type", type: "VARCHAR(50)" },
          { name: "amount", type: "DECIMAL(15,2)" },
          { name: "interest_rate", type: "DECIMAL(5,2)" },
          { name: "start_date", type: "DATE" },
          { name: "end_date", type: "DATE" },
          { name: "branch_id", type: "INT" }
        ]
      },
      Branches: {
        columns: [
          { name: "branch_id", type: "INT", primaryKey: true },
          { name: "branch_name", type: "VARCHAR(100)" },
          { name: "location", type: "VARCHAR(200)" },
          { name: "manager_id", type: "INT" }
        ]
      },
      Cards: {
        columns: [
          { name: "card_id", type: "INT", primaryKey: true },
          { name: "account_id", type: "INT" },
          { name: "card_number", type: "VARCHAR(20)" },
          { name: "card_type", type: "VARCHAR(50)" },
          { name: "expiry_date", type: "DATE" },
          { name: "cvv", type: "VARCHAR(4)" }
        ]
      }
    },
    relationships: [
      { from: "Accounts", to: "Customers", type: "Many-to-One" },
      { from: "Accounts", to: "Branches", type: "Many-to-One" },
      { from: "Transactions", to: "Accounts", type: "Many-to-One" },
      { from: "Loans", to: "Customers", type: "Many-to-One" },
      { from: "Loans", to: "Branches", type: "Many-to-One" },
      { from: "Cards", to: "Accounts", type: "Many-to-One" }
    ]
  }
};

module.exports = demoDatabases;
