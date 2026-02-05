//for checking the role of the user
const roleCheck = (...allowedRoles)=>{
    return (req, res, next)=>{
        try{
            const userRole = req.user.role;
            if(!userRole){
                return res.status(403).json({
                    error:'Access denied: No role found'
                });
            }
                if(!allowedRoles.includes(userRole)){
                    return res.status(403).json({
                        error : `Access Denied: Only ${allowedRoles.join(', ')} can perform this action`
                    });
                }
                next();
        }catch(error){
            console.error('Role check error: ', error);
            res.status(500).json({error: 'Server error'});
        }
    }
};

module.exports = roleCheck;