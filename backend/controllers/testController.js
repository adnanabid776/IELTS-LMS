const Test = require('../models/Test');
const Section = require('../models/Section');

exports.createTest = async (req, res)=>{
    try{
        const {title, module, description, duration , difficulty, instructions} = req.body;
        const userId = req.user.userId;
        //validate the required fields
        if(!title || !module || !duration){
            return res.status(400).json({error: 'Title, module, and duration are required.'});
        }
        //create test 
        const test = await Test.create({
            title,
            module,
            description,
            duration,
            difficulty : difficulty || 'medium',
            instructions,
            createdBy: userId,
            totalQuestions : 0,
            totalSections : 0
        });
        res.status(201).json({
            message : 'Test created successfully',
            test
        })
    }catch(error){
        console.error('Create test error: ', error);
        res.status(500).json({error: 'Server error'});
    }
}
exports.getAllTests = async (req, res) => {
  try {
    const { module, difficulty, isActive } = req.query;

    // Build filter
    const filter = {};
    if (module) filter.module = module;
    if (difficulty) filter.difficulty = difficulty;
    if (isActive !== undefined) filter.isActive = isActive;

    const tests = await Test.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      count: tests.length,
      tests
    });

  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single test by ID
exports.getTestById = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id)
      .populate('createdBy', 'firstName lastName email');

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get sections for this test
    const sections = await Section.find({ testId: id })
      .sort({ sectionNumber: 1 });

    res.json({
      test,
      sections
    });

  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update test
exports.updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration, difficulty, instructions, isActive } = req.body;

    const test = await Test.findByIdAndUpdate(
      id,
      { title, description, duration, difficulty, instructions, isActive },
      { new: true, runValidators: true }
    );

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({
      message: 'Test updated successfully',
      test
    });

  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete test
exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findByIdAndDelete(id);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Also delete all sections and questions for this test
    await Section.deleteMany({ testId: id });
    
    res.json({
      message: 'Test deleted successfully'
    });

  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get tests by module
exports.getTestsByModule = async (req, res) => {
  try {
    const { module } = req.params;

    const tests = await Test.find({ module, isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      count: tests.length,
      tests
    });

  } catch (error) {
    console.error('Get tests by module error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};