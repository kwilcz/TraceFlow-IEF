using B2CReplacementDesigner.Server.Services;
using B2CReplacementDesigner.Server.Validation;
using FluentValidation;

namespace B2CReplacementDesigner.Server
{
    public class Program
    {
        private static readonly string CorsPolicyName = "CorsPolicy";
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            var allowedOrigins =
                Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")?.Split(",") ??
                ["http://localhost:3000"];

            builder.Services.AddCors(options =>
            {
                options.AddPolicy(CorsPolicyName,
                    configuration =>
                    {
                        configuration.WithOrigins(allowedOrigins)
                            .AllowAnyHeader()
                            .AllowAnyMethod();
                    });
            });
            
            // Add services to the container.
            builder.Services.AddControllers();
            builder.Services.AddLogging();

            builder.Services.AddScoped<ITrustFrameworkPolicyProcessor, TrustFrameworkPolicyProcessor>();
            builder.Services.AddScoped<IPolicyConsolidator, PolicyConsolidator>();
            builder.Services.AddScoped<IPolicyEntityExtractor, PolicyEntityExtractor>();
            builder.Services.AddScoped<IPolicyMerger, PolicyMerger>();
            builder.Services.AddScoped<IValidator<TrustFrameworkPolicy>, TrustFrameworkPolicyValidator>();

            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // app.UseDefaultFiles();
            // app.UseStaticFiles();

            app.UseCors(CorsPolicyName);

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();
            app.UseAuthorization();

            app.MapControllers();
            app.UsePathBase(new PathString("/api"));

            app.Run();
        }
    }
}