# NotePut

NotePut is a web application designed to help teachers digitize, manage, and monitor student grades more efficiently.

The project addresses a common problem in education: teachers often have grades recorded on paper or stored in different Excel files, making it time-consuming to organize, update, and analyze students' academic performance.

With NotePut, teachers will be able to upload a photo of a physical grade sheet or an existing Excel file and transform that information into an **editable digital grade template**.

## 🎯 Main Goal

The main goal of NotePut is to reduce the time teachers spend manually transferring grades while providing a simple way to keep track of students' academic progress.

The application will combine traditional data management with **AI-powered document and table recognition** to extract information from photographed grade sheets.

## ✨ Planned Features

### 📷 Grade Sheet Recognition

Teachers will be able to upload a photo of their physical grade sheet.

NotePut will use AI/OCR technology to detect information such as:

* Student names
* Grades
* Grade columns
* Other relevant information available in the document

The extracted information will then be converted into an editable digital table.

### 📊 Editable Grade Templates

After importing the information, teachers will be able to edit the grades directly inside the application.

Each template will contain:

* Student names
* Grade columns
* Automatically calculated averages
* Academic status
* Optional attendance information

Teachers will also be able to configure how many grade columns their subject requires.

### 📈 Academic Progress Indicators

NotePut will provide visual indicators to help teachers identify students who may be struggling academically.

Student names can change appearance according to their current performance.

For example:

* 🟢 Satisfactory performance
* 🟡 At risk
* 🔴 Insufficient performance

The thresholds will be configurable according to the institution's grading system.

### 🎓 Multiple Grading Scales

The application will support different grading systems, such as:

* `0.0 – 5.0`
* `0 – 100`
* `0 – 1`

The teacher will select the grading scale when creating a template.

### 📥 Excel Import

Teachers who already manage their grades using Excel will be able to import their existing spreadsheets into NotePut.

This allows the application to work with existing workflows instead of requiring teachers to completely change how they manage their grades.

### 📤 Excel Export

Templates can be exported back to Excel so teachers can keep a local copy, share it, or continue working with it using traditional spreadsheet software.

### 💾 Saved Templates

Teachers will be able to save their templates and continue editing them later.

New templates will receive a default name such as:

`Template 01`

The teacher can rename the template whenever they want.

Example:

```text
Mathematics - 10A
Physics - 11B
English - 9C
```

### 📝 Attendance

Templates may optionally include student attendance.

Teachers will be able to add attendance records when required without forcing attendance information into templates that do not use it.

## 🤖 AI Integration

One of the main technical challenges of NotePut will be converting an image of a physical grade sheet into structured data.

The planned workflow is:

```text
Physical Grade Sheet
        ↓
      📷 Photo
        ↓
     OCR / AI
        ↓
  Structured Data
        ↓
 Data Validation
        ↓
 Editable Template
```

AI-generated information will remain editable so teachers can correct recognition errors before using the data.

## 🏗️ Project Architecture

NotePut is planned as a full-stack application.

Possible components include:

```text
Frontend
   ↓
Backend / API
   ↓
Database
   ↓
AI / OCR Services
   ↓
File Processing
```

The project will evolve gradually, beginning with the core grade-management functionality before introducing AI-based recognition.

## 🛣️ Development Roadmap

### Phase 1 — Core Grade Management

* [ ] Create grade templates
* [ ] Add students
* [ ] Add grades
* [ ] Calculate averages
* [ ] Configure grading scales
* [ ] Display academic status

### Phase 2 — Excel Integration

* [ ] Import Excel files
* [ ] Convert spreadsheet data into templates
* [ ] Edit imported information
* [ ] Export templates to Excel

### Phase 3 — User Accounts & Storage

* [ ] User registration
* [ ] Login
* [ ] Save templates
* [ ] Rename templates
* [ ] Edit previously saved templates

### Phase 4 — AI/OCR

* [ ] Upload grade-sheet images
* [ ] Detect student names
* [ ] Detect grades
* [ ] Detect table structure
* [ ] Validate extracted information
* [ ] Convert results into editable templates

### Phase 5 — Attendance

* [ ] Attendance tracking
* [ ] Add attendance records
* [ ] Connect attendance with students

### Phase 6 — Freemium Model

The initial concept includes a free and premium model.

The free version may limit the number of template imports per day, while premium users would have higher or unlimited usage.

This part of the project will be evaluated and adjusted as the application develops.

## 🎯 Project Purpose

NotePut is also a personal software engineering project focused on learning and applying real-world development practices.

The project will be used to explore:

* Full-stack development
* Artificial Intelligence
* OCR and document processing
* Database design
* REST APIs
* Excel file processing
* Authentication
* Software architecture
* Testing
* Git and GitHub workflows
* Deployment

> **Note:** NotePut is currently under development. Features, architecture, technologies, and the business model may change as the project evolves.
