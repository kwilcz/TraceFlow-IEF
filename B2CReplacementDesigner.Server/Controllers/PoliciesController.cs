using B2CReplacementDesigner.Server.Exceptions;
using B2CReplacementDesigner.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace B2CReplacementDesigner.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PoliciesController : ControllerBase
    {
        private readonly ITrustFrameworkPolicyProcessor _policyProcessor;
        private readonly ProblemDetailsFactory _problemDetailsFactory;
        private ILogger<PoliciesController> _logger;

        public PoliciesController(ITrustFrameworkPolicyProcessor policyProcessor, ProblemDetailsFactory problemDetailsFactory, ILogger<PoliciesController> logger)
        {
            _policyProcessor = policyProcessor;
            _problemDetailsFactory = problemDetailsFactory;
            _logger = logger;
        }

        [HttpPost("merge")]
        public async Task<IActionResult> UploadPolicies([FromForm] IFormFileCollection files)
        {
            if (files == null || files.Count == 0)
            {
                var problemDetails = _problemDetailsFactory.CreateProblemDetails(
                    HttpContext,
                    statusCode: 400,
                    title: "No files were uploaded",
                    detail: "You need to upload at least one XML file."
                );
                return BadRequest(problemDetails);
            }

            try
            {
                var response = await _policyProcessor.ProcessPoliciesAsync(files);
                return Ok(response);
            }
            catch (PolicyValidationException ex)
            {
                _logger.LogError(ex, "Policy validation error");
                var problemDetails = _problemDetailsFactory.CreateProblemDetails(
                    HttpContext,
                    statusCode: 400,
                    title: "Validation error",
                    detail: ex.Message
                );
                return BadRequest(problemDetails);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Policy processing error");
                var problemDetails = _problemDetailsFactory.CreateProblemDetails(
                    HttpContext,
                    statusCode: 500,
                    title: "Processing error",
                    detail: ex.Message
                );
                return StatusCode(500, problemDetails);
            }
        }
    }
}
